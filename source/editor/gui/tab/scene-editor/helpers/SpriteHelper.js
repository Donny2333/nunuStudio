import {Object3D, Sprite, SpriteMaterial, Mesh} from "three";

/** 
 * Sprite helper is used to preview sprite objects.
 *
 * @class SpriteHelper
 * @param {Object3D} object
 * @param {number} hex Helper color in hexadecimal.
 */
function SpriteHelper(object, hex)
{
	var instance = Reflect.construct(Sprite, [new SpriteMaterial(
		{color: hex !== undefined ? hex : 0xFFFFFF})], new.target || SpriteHelper);

	instance.object = object;
	instance.matrixAutoUpdate = false;
	instance.update();

	return instance;
}

SpriteHelper.prototype = Object.create(Mesh.prototype);

SpriteHelper.prototype.update = function()
{
	this.matrixWorld.copy(this.object.matrixWorld);
};
export {SpriteHelper};
