import {Vec3, Sphere, Box, Plane, ConvexPolyhedron, Trimesh, Heightfield, Shape} from "cannon-es";
import {Object3D, MeshBasicMaterial, SphereGeometry, BoxGeometry, PlaneGeometry, CylinderGeometry, Mesh, BufferGeometry, Float32BufferAttribute, Vector3} from "three";

/**
 * Helper to preview physics objects on the editor.
 *
 * Based on code from CANNON debug shape renderer made by schteppe
 *
 * @class PhysicsObjectHelper
 */
function PhysicsObjectHelper(object, color)
{
	var instance = Reflect.construct(Object3D, [], new.target || PhysicsObjectHelper);

	/**
	 * Object attached to the helper.
	 *
	 * @attribute object
	 * @type {Object3D}
	 */
	instance.object = object;

	/**
	 * Meshes used to represent the shapes attached to the body.
	 *
	 * @attribute meshes
	 * @type {Array}
	 */
	instance.meshes = [];
	instance.matrixAutoUpdate = false;

	instance.material = new MeshBasicMaterial(
		{
			color: color !== undefined ? color : 0x00FF00,
			wireframe: false,
			transparent: true,
			opacity: 0.5
		});

	return instance;
}

PhysicsObjectHelper.SPHERE = new SphereGeometry(1, 32, 32);
PhysicsObjectHelper.BOX = new BoxGeometry(1, 1, 1);
PhysicsObjectHelper.PLANE = new PlaneGeometry(100, 100);
PhysicsObjectHelper.CYLINDER = new CylinderGeometry(1, 1, 10, 32);

PhysicsObjectHelper.prototype = Object.create(Object3D.prototype);

/**
 * Update the helper from the physics body.
 *
 * @method update
 */
PhysicsObjectHelper.prototype.update = function()
{
	this.matrix.copy(this.object.matrixWorld);

	var body = this.object.body;
	var index = 0;

	// Iterate all the shapes in the physics body
	for (var j = 0; j < body.shapes.length; j++)
	{
		var shape = body.shapes[j];

		this.updateMesh(index, body, shape);

		var mesh = this.meshes[index];
		if (mesh !== undefined)
		{
			var tmpVec = new Vec3();
			var tmpQuat = new Vec3();

			// Get world position
			body.quaternion.vmult(body.shapeOffsets[j], tmpVec);
			body.position.vadd(tmpVec, tmpVec);

			// Get world quaternion
			body.quaternion.mult(body.shapeOrientations[j], tmpQuat);

			// Copy to meshes
			mesh.position.copy(tmpVec);
			mesh.quaternion.copy(tmpQuat);
		}

		index++;
	}

	for (var i = index; i < this.meshes.length; i++)
	{
		var mesh = index[i];
		if (mesh)
		{
			this.remove(mesh);
		}
	}

	this.meshes.length = index;
};

PhysicsObjectHelper.prototype.updateMesh = function(index, body, shape)
{
	var mesh = this.meshes[index];
	if (!this.typeMatch(mesh, shape))
	{
		if (mesh)
		{
			this.remove(mesh);
		}
		mesh = this.meshes[index] = this.createMesh(shape);
	}

	this.scaleMesh(mesh, shape);
};

/**
 * Check if the mesh attahched to this helper object matches the CANNON body shape.
 *
 * @method typeMatch
 * @return {boolean} True if the mesh matches the shape.
 */
PhysicsObjectHelper.prototype.typeMatch = function(mesh, shape)
{
	if (!mesh)
	{
		return false;
	}

	var geometry = mesh.geometry;

	return geometry instanceof SphereGeometry && shape instanceof Sphere ||
	geometry instanceof BoxGeometry && shape instanceof Box ||
	geometry instanceof PlaneGeometry && shape instanceof Plane ||
	(geometry.id === shape.geometryId && (shape instanceof ConvexPolyhedron || shape instanceof Trimesh) || shape instanceof Heightfield);
};

/**
 * Create a mesh to represent a CANNON physics shape and attach it to this helper object.
 *
 * @method createMesh
 * @return {Mesh} Mesh created to represent the shape.
 */
PhysicsObjectHelper.prototype.createMesh = function(shape)
{
	var material = this.material;
	var mesh = null;

	switch (shape.type)
	{
	case Shape.types.SPHERE:
		mesh = new Mesh(PhysicsObjectHelper.SPHERE, material);
		break;

	case Shape.types.PARTICLE:
		mesh = new Mesh(PhysicsObjectHelper.SPHERE, material);
		break;

	case Shape.types.BOX:
		mesh = new Mesh(PhysicsObjectHelper.BOX, material);
		break;

	case Shape.types.PLANE:
		mesh = new Mesh(PhysicsObjectHelper.PLANE, material);
		mesh.scale.set(1000, 1000, 1);
		break;

	case Shape.types.CONVEXPOLYHEDRON:
		var geo = new BufferGeometry();
		var vertices = [];
		var indices = [];

		for (var i = 0; i < shape.vertices.length; i++)
		{
			var v = shape.vertices[i];
			vertices.push(v.x, v.y, v.z);
		}

		for (var i = 0; i < shape.faces.length; i++)
		{
			var face = shape.faces[i];
			var a = face[0];
			for (var j = 1; j < face.length - 1; j++)
			{
				indices.push(a, face[j], face[j + 1]);
			}
		}

		geo.setAttribute("position", new Float32BufferAttribute(vertices, 3));
		geo.setIndex(indices);
		geo.computeBoundingSphere();
		geo.computeVertexNormals();
		mesh = new Mesh(geo, material);
		shape.geometryId = geo.id;
		break;

	case Shape.types.TRIMESH:
		var geometry = new BufferGeometry();
		var vertices = [];
		var v0 = new Vec3();
		var v1 = new Vec3();
		var v2 = new Vec3();
		for (var i = 0; i < shape.indices.length / 3; i++)
		{
			shape.getTriangleVertices(i, v0, v1, v2);
			vertices.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
		}
		geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
		geometry.computeBoundingSphere();
		geometry.computeVertexNormals();
		mesh = new Mesh(geometry, material);
		shape.geometryId = geometry.id;
		break;

	case Shape.types.HEIGHTFIELD:
		var geometry = new BufferGeometry();
		var vertices = [];
		var v0 = new Vec3();
		var v1 = new Vec3();
		var v2 = new Vec3();

		for (var xi = 0; xi < shape.data.length - 1; xi++)
		{
			for (var yi = 0; yi < shape.data[xi].length - 1; yi++)
			{
				for (var k = 0; k < 2; k++)
				{
					shape.getConvexTrianglePillar(xi, yi, k === 0);
					v0.copy(shape.pillarConvex.vertices[0]);
					v1.copy(shape.pillarConvex.vertices[1]);
					v2.copy(shape.pillarConvex.vertices[2]);
					v0.vadd(shape.pillarOffset, v0);
					v1.vadd(shape.pillarOffset, v1);
					v2.vadd(shape.pillarOffset, v2);
					vertices.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
				}
			}
		}

		geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
		geometry.computeBoundingSphere();
		geometry.computeVertexNormals();
		mesh = new Mesh(geometry, material);
		shape.geometryId = geometry.id;
		break;
	}

	if (mesh !== null)
	{
		this.add(mesh);
	}

	return mesh;
};

/**
 * Set to correct scale of the helper mesh based on the shape type and size configuration.
 *
 * @method scaleMesh
 * @param {Mesh} mesh Mesh to be changed.
 * @param {Shape} shape Shape to analyse and extract scale from.
 */
PhysicsObjectHelper.prototype.scaleMesh = function(mesh, shape)
{
	var type = shape.type;

	if (type === Shape.types.SPHERE)
	{
		var radius = shape.radius;
		mesh.scale.set(radius, radius, radius);
	}
	else if (type === Shape.types.PARTICLE)
	{
		mesh.scale.set(0.1, 0.1, 0.1);
	}
	else if (type === Shape.types.BOX)
	{
		mesh.scale.copy(shape.halfExtents);
		mesh.scale.multiplyScalar(2);
	}
	else if (type === Shape.types.CONVEXPOLYHEDRON)
	{
		mesh.scale.set(1, 1, 1);
	}
	else if (type === Shape.types.TRIMESH)
	{
		mesh.scale.copy(shape.scale);
	}
	else if (type === Shape.types.HEIGHTFIELD)
	{
		mesh.scale.set(1, 1, 1);
	}
};

export {PhysicsObjectHelper};
