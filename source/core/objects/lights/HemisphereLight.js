import {HemisphereLight as THemisphereLight} from "three";

/**
 * A light source positioned directly above the scene, with color fading from the sky color to the ground color.
 *
 * Based on HemisphereLight documentation for the object can be found at https:// threejs.org/docs/index.html#Reference/Lights/HemisphereLight
 *
 * @param {number} skyColor Sky light color in hex RGB
 * @param {number} groundColor Ground light color in hex RGB
 * @param {number} intensity Light intensity
 * @class HemisphereLight
 * @extends {HemisphereLight}
 * @module Lights
 */
function HemisphereLight(skyColor, groundColor, intensity)
{
	var instance = Reflect.construct(THemisphereLight, [skyColor, groundColor, intensity], new.target || HemisphereLight);

	instance.name = "hemisphere";

	return instance;
}

HemisphereLight.prototype = Object.create(THemisphereLight.prototype);

export {HemisphereLight};
