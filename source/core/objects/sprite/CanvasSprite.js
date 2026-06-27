import {Sprite, SpriteMaterial} from "three";
import {CanvasTexture} from "../../texture/CanvasTexture.js";

/**
 * Canvas sprite is used to render canvas based elements in a 2D canvas.
 *
 * The sprite can be configured to keep a relative size to the screen of an absolute size.
 * 
 * @class CanvasSprite
 * @extends {Sprite}
 */
function CanvasSprite()
{
	var _texture = new CanvasTexture();
	var _canvas = _texture.image;

	var material = new SpriteMaterial(
		{
			map: _texture,
			color: 0xFFFFFF,
			transparent: true,
			alphaTest: 0.4,
			depthTest: true,
			depthWrite: true,
			sizeAttenuation: true
		});

	var instance = Reflect.construct(Sprite, [material], new.target || CanvasSprite);

	instance.texture = _texture;
	instance.canvas = _canvas;
	instance.name = "sprite";
	instance.type = "CanvasSprite";

	Object.defineProperties(instance,
		{
			sizeAttenuation:
		{
			get: function() {return instance.material.sizeAttenuation;},
			set: function(value)
			{
				instance.material.sizeAttenuation = value;
				instance.material.needsUpdate = true;
			}
		}
		});

	return instance;
}	

CanvasSprite.prototype = Object.create(Sprite.prototype);

export {CanvasSprite};
