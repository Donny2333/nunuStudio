import {DirectionalLight as TDirectionalLight} from "three";

/**
 * A light that gets emitted in a specific direction.
 *
 * This light will behave as though it is infinitely far away and the rays produced from it are all parallel.
 *
 * Based on DirectionalLight documentation for the object can be found at https:// threejs.org/docs/index.html#Reference/Lights/DirectionalLight
 *
 * @param {number} hex Light color in hex RGB
 * @param {number} intensity Light intensity
 * @class DirectionalLight
 * @extends {DirectionalLight}
 * @module Lights
 */
function DirectionalLight(hex, intensity)
{
	var instance = Reflect.construct(TDirectionalLight, [hex, intensity], new.target || DirectionalLight);

	instance.name = "directional";

	instance.castShadow = true;

	instance.shadow.camera.near = 0.5;
	instance.shadow.camera.far = 10000;

	return instance;
}

DirectionalLight.prototype = Object.create(TDirectionalLight.prototype);

/**
 * Update light shadow map attributes at runtime.
 *
 * @method updateShadowMap
 */
DirectionalLight.prototype.updateShadowMap = function()
{
	this.shadow.map.dispose();
	this.shadow.map = null;
	this.shadow.camera.updateProjectionMatrix();
};

export {DirectionalLight};
