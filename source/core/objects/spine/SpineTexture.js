import {ThreeJsTexture} from "@esotericsoftware/spine-threejs";
import {Texture} from "../../texture/Texture.js";

/**
 * Spine animation textures are used alognside with SpineAnimation objects.
 *
 * Each animations sprite atlas uses a SpineTexture object.
 *
 * @class SpineTexture
 * @module Textures
 * @param {Texture} texture Texture to be used inside of this spine texture.
 */
function SpineTexture(texture)
{
	var instance = Reflect.construct(ThreeJsTexture, [texture.image], new.target || SpineTexture);

	instance.texture = texture;
	instance.texture.flipY = false;

	return instance;
}

SpineTexture.prototype = Object.create(ThreeJsTexture.prototype);
SpineTexture.prototype.constructor = SpineTexture;

export {SpineTexture};
