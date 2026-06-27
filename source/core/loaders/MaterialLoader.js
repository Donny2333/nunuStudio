import {DefaultLoadingManager, MaterialLoader as TMaterialLoader} from "three";

/**
 * MaterialLoader can be used to load external materials.
 *
 * @class MaterialLoader
 * @module Loaders
 * @param {Object} manager
 */
function MaterialLoader(manager)
{
	var instance = Reflect.construct(TMaterialLoader, [manager], new.target || MaterialLoader);
	return instance;
}

MaterialLoader.prototype = Object.create(TMaterialLoader.prototype);
MaterialLoader.prototype.constructor = MaterialLoader;

/**
 * Set texture array to be used when loading materials
 *
 * @method setTextures
 * @param {Array} value
 */
MaterialLoader.prototype.setTextures = function(value)
{
	this.textures = value;
};

/**
 * Parse material JSON.
 *
 * @method parse
 * @param {Object} json
 * @return {Material} material
 */
MaterialLoader.prototype.parse = function(json)
{
	var material = TMaterialLoader.prototype.parse.call(this, json);

	// Legacy multi-material
	if (json.materials !== undefined)
	{
		for (var i = 0, l = json.materials.length; i < l; i ++)
		{
			material.materials.push(this.parse(json.materials[i]));
		}
	}

	return material;
};
export {MaterialLoader};
