import {AmbientLight as TAmbientLight} from "three";

/**
 * Ambient lights are used to create base ilumanition for the scene.
 *
 * They are not influenced by position, scale or rotation.
 *
 * Based on AmbientLight documentation for the object can be found at https:// threejs.org/docs/index.html#Reference/Lights/AmbientLight
 *
 * @param {number} hex Light color in hex RGB
 * @param {number} intensity Light intensity
 * @class AmbientLight
 * @extends {AmbientLight}
 * @module Lights
 */
function AmbientLight(hex, intensity)
{
	var instance = Reflect.construct(TAmbientLight, [hex, intensity], new.target || AmbientLight);

	instance.name = "ambient";

	instance.matrixAutoUpdate = false;

	return instance;
}

AmbientLight.prototype = Object.create(TAmbientLight.prototype);
export {AmbientLight};
