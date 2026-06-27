import {Line, Color} from "three";

/** 
 * Line helper is used to preview Line objects.
 * 
 * @class LineHelper
 * @param {Line} object
 * @param {number} hex Helper color in hexadecimal.
 */
function LineHelper(object, hex)
{
	var instance = Reflect.construct(Line, [object.geometry, object.material.clone()], new.target || LineHelper);

	instance.material.color = new Color(hex !== undefined ? hex : 0xFFFF00);
	instance.object = object;
	instance.matrixAutoUpdate = false;
	instance.update();

	return instance;
}

LineHelper.prototype = Object.create(Line.prototype);

LineHelper.prototype.update = function()
{
	this.geometry = this.object.geometry;
	this.matrix.copy(this.object.matrixWorld);
};
export {LineHelper};
