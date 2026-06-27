import {Mesh, PlaneGeometry, MeshBasicMaterial, DoubleSide} from "three";

/**
 * Helper to visualizer rect aread lights.
 *
 * @class RectAreaLightHelper
 */
function RectAreaLightHelper(object)
{
	var instance = Reflect.construct(Mesh, [new PlaneGeometry(1, 1), new MeshBasicMaterial({side: DoubleSide})], new.target || RectAreaLightHelper);

	instance.object = object;
	instance.update();

	return instance;
}

RectAreaLightHelper.prototype = Object.create(Mesh.prototype);

RectAreaLightHelper.prototype.update = function()
{
	this.material.color.copy(this.object.color).multiplyScalar(this.object.intensity);

	this.object.getWorldPosition(this.position);
	this.object.getWorldQuaternion(this.quaternion);

	this.scale.set(this.object.width, this.object.height, 1);
};
export {RectAreaLightHelper};
