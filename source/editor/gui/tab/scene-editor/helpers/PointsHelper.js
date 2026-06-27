import {Points, Color} from "three";

/** 
 * Point helper is used to preview Points objects.
 * 
 * @class PointsHelper
 * @param {Points} object
 * @param {number} hex Helper color in hexadecimal.
 */
function PointsHelper(object, hex)
{
	var instance = Reflect.construct(Points, [object.geometry, object.material.clone()], new.target || PointsHelper);

	instance.material.color = new Color(hex !== undefined ? hex : 0xFFFF00);
	instance.material.size = object.material.size * 1.2;
	instance.object = object;
	instance.matrixAutoUpdate = false;
	instance.update();

	return instance;
}

PointsHelper.prototype = Object.create(Points.prototype);

PointsHelper.prototype.update = function()
{
	this.geometry = this.object.geometry;
	this.matrix.copy(this.object.matrixWorld);
};

export {PointsHelper};
