import {Vector3, BufferGeometry, Quaternion} from "three";
import {mergeVertices} from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * The twist modifier applies a tornado twist like deformation to the geometry.
 *
 * It follows a vector from a start to and end point in the vector and rotates all vertex for each point up to a defined final angle.
 *
 * @class TwistModifier
 */
function TwistModifier(angle, start, end)
{
	/**
	 * Twist direction vector, the twist is performed around this vector in its direction.
	 *
	 * @attribute direction
	 * @type {Vector3}
	 */
	this.direction = new Vector3(0, 1, 0);

	/**
	 * Twist angle of rotation, applied from the start to the end of rotation.
	 *
	 * @attribute angle
	 * @type {number}
	 */
	this.angle = angle !== undefined ? angle : Math.PI;

	/**
	 * Start height of the twist rotation.
	 *
	 * @attribute start
	 * @type {number}
	 */
	this.start = start !== undefined ? start : 0;

	/*
	 * End height of the twist rotation.
	 *
	 * @attribute end
	 * @type {number}
	 */
	this.end = end !== undefined ? end : 1;
}

/**
 * Apply the modifier to a geometry object, creates a new geometry with the result.
 *
 * @method modify
 * @param {BufferGeometry} geometry Geometry to be transformed.
 * @return {BufferGeometry} Result geometry after applying the modifier.
 */
TwistModifier.prototype.modify = function(geometry)
{
	geometry = mergeVertices(geometry.clone());

	var positionAttr = geometry.getAttribute("position");
	var quaternion = new Quaternion();

	for (var i = 0; i < positionAttr.count; i++)
	{
		var y = positionAttr.getY(i);

		if (y >= this.start && y <= this.end)
		{
			var interpolate = (y - this.start) / (this.end - this.start);
			quaternion.setFromAxisAngle(this.direction, this.angle * interpolate);

			var v = new Vector3(positionAttr.getX(i), positionAttr.getY(i), positionAttr.getZ(i));
			v.applyQuaternion(quaternion);
			positionAttr.setXYZ(i, v.x, v.y, v.z);
		}
		else if (y > this.end)
		{
			quaternion.setFromAxisAngle(this.direction, this.angle);

			var v = new Vector3(positionAttr.getX(i), positionAttr.getY(i), positionAttr.getZ(i));
			v.applyQuaternion(quaternion);
			positionAttr.setXYZ(i, v.x, v.y, v.z);
		}
	}

	positionAttr.needsUpdate = true;
	geometry.computeVertexNormals();

	return geometry;
};

export {TwistModifier};
