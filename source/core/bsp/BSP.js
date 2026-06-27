import {BufferGeometry, Matrix4, Mesh, Vector2, Vector3, Float32BufferAttribute} from "three";
import {BSPNode} from "./BSPNode.js";
import {BSPPolygon} from "./BSPPolygon.js";
import {BSPVertex} from "./BSPVertex.js";

function BSP(geometry)
{
	var polygons = [];

	if (geometry instanceof BufferGeometry)
	{
		this.matrix = new Matrix4();
		polygons = BSP.geometryToPolygons(geometry, this.matrix);
	}
	else if (geometry instanceof Mesh)
	{
		geometry.updateMatrix();
		this.matrix = geometry.matrix.clone();
		polygons = BSP.geometryToPolygons(geometry.geometry, this.matrix);
	}
	else if (geometry instanceof BSPNode)
	{
		this.tree = geometry;
		this.matrix = new Matrix4();
		return this;
	}
	else
	{
		throw new Error("nunuStudio: Given geometry is unsupported");
	}

	this.tree = new BSPNode(polygons);
}

BSP.geometryToPolygons = function(bufferGeometry, matrix)
{
	var polygons = [];
	var position = bufferGeometry.getAttribute("position");
	var normal = bufferGeometry.getAttribute("normal");
	var uv = bufferGeometry.getAttribute("uv");
	var index = bufferGeometry.index;

	var triCount = index ? index.count / 3 : position.count / 3;

	for (var i = 0; i < triCount; i++)
	{
		var polygon = new BSPPolygon();
		var indices = [];

		if (index)
		{
			indices = [index.getX(i * 3), index.getX(i * 3 + 1), index.getX(i * 3 + 2)];
		}
		else
		{
			indices = [i * 3, i * 3 + 1, i * 3 + 2];
		}

		for (var j = 0; j < 3; j++)
		{
			var idx = indices[j];
			var pos = new Vector3(position.getX(idx), position.getY(idx), position.getZ(idx));
			var nor = normal ? new Vector3(normal.getX(idx), normal.getY(idx), normal.getZ(idx)) : new Vector3();
			var uvCoord = uv ? new Vector2(uv.getX(idx), uv.getY(idx)) : new Vector2();

			var vertex = new BSPVertex(pos.x, pos.y, pos.z, nor, uvCoord);
			vertex.applyMatrix4(matrix);
			polygon.vertices.push(vertex);
		}

		polygon.calculateProperties();
		polygons.push(polygon);
	}

	return polygons;
};

BSP.prototype.subtract = function(otherTree)
{
	var a = this.tree.clone();
	var b = otherTree.tree.clone();

	a.invert();
	a.clipTo(b);
	b.clipTo(a);
	b.invert();
	b.clipTo(a);
	b.invert();
	a.build(b.allPolygons());
	a.invert();
	a = new BSP(a);
	a.matrix = this.matrix;
	return a;
};

BSP.prototype.union = function(otherTree)
{
	var a = this.tree.clone();
	var b = otherTree.tree.clone();

	a.clipTo(b);
	b.clipTo(a);
	b.invert();
	b.clipTo(a);
	b.invert();
	a.build(b.allPolygons());
	a = new BSP(a);
	a.matrix = this.matrix;
	return a;
};

BSP.prototype.intersect = function(otherTree)
{
	var a = this.tree.clone();
	var b = otherTree.tree.clone();

	a.invert();
	b.clipTo(a);
	b.invert();
	a.clipTo(b);
	b.clipTo(a);
	a.build(b.allPolygons());
	a.invert();
	a = new BSP(a);
	a.matrix = this.matrix;
	return a;
};

BSP.prototype.toGeometry = function()
{
	var matrix = new Matrix4().copy(this.matrix).invert();
	var polygons = this.tree.allPolygons();
	var positions = [];
	var normals = [];
	var uvs = [];

	for (var i = 0; i < polygons.length; i++)
	{
		var polygon = polygons[i];
		var verticeCount = polygon.vertices.length;

		for (var j = 2; j < verticeCount; j++)
		{
			var verts = [polygon.vertices[0], polygon.vertices[j - 1], polygon.vertices[j]];

			for (var k = 0; k < 3; k++)
			{
				var vertex = new Vector3(verts[k].x, verts[k].y, verts[k].z);
				vertex.applyMatrix4(matrix);
				positions.push(vertex.x, vertex.y, vertex.z);
				normals.push(polygon.normal.x, polygon.normal.y, polygon.normal.z);

				if (verts[k].uv)
				{
					uvs.push(verts[k].uv.x, verts[k].uv.y);
				}
				else
				{
					uvs.push(0, 0);
				}
			}
		}
	}

	var geometry = new BufferGeometry();
	geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
	geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
	geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));

	return geometry;
};

BSP.prototype.toMesh = function(material)
{
	var geometry = this.toGeometry();
	var mesh = new Mesh(geometry, material);

	mesh.position.setFromMatrixPosition(this.matrix);
	mesh.rotation.setFromRotationMatrix(this.matrix);

	return mesh;
};

export {BSP};
