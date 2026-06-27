import {Object3D, Mesh, MeshBasicMaterial} from "three";

/** 
 * Wireframe helper is used to preview drawable objects.
 * 
 * Every line is drawn individually, usefull to analyse the geometry in detail.
 *
 * @class WireframeHelper
 * @param {Object3D} object
 * @param {number} hex Helper color in hexadecimal.
 */
function WireframeHelper(object, hex)
{
	var instance = Reflect.construct(Mesh, [object.geometry, new MeshBasicMaterial(
		{
			color: hex !== undefined ? hex : 0xFFFFFF,
			wireframe: true
		})], new.target || WireframeHelper);

	instance.object = object;
	instance.matrixAutoUpdate = false;
	instance.update();

	return instance;
}

WireframeHelper.prototype = Object.create(Mesh.prototype);

WireframeHelper.prototype.update = function()
{
	this.geometry = this.object.geometry;
	this.matrix.copy(this.object.matrixWorld);
};
export {WireframeHelper};
