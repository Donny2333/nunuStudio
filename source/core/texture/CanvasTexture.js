import {Texture, RGBAFormat} from "three";

/**
 * Canvas textures can be used to draw content to the texture during runtime, using the context property.
 * 
 * Canvas textures always start with black background and a red text "Canvas Texture".
 * 
 * @class CanvasTexture
 * @extends {Texture}
 * @module Textures
 * @param {number} width Canvas width
 * @param {number} height Canvas height
 * @param {number} mapping
 * @param {number} wrapS
 * @param {number} wrapT
 * @param {number} magFilter
 * @param {number} minFilter
 * @param {number} format
 * @param {number} type
 * @param {number} anisotropy
 * @param {number} encoding
 */
function CanvasTexture(width, height, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy, encoding)
{
	var instance = Reflect.construct(Texture, [document.createElement("canvas"), mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy, encoding], new.target || CanvasTexture);

	instance.name = "canvas";
	instance.category = "Canvas";
	instance.format = RGBAFormat;

	Object.defineProperties(instance,
		{
			width:
		{
			get: function() {return instance.image.width;},
			set: function(value) {instance.image.width = value;}
		},
			height:
		{
			get: function() {return instance.image.height;},
			set: function(value) {instance.image.height = value;}
		}
		});

	instance.width = width !== undefined ? width : 1;
	instance.height = height !== undefined ? height : 1;

	instance.context = instance.image.getContext("2d");

	return instance;
}

CanvasTexture.prototype = Object.create(Texture.prototype);
CanvasTexture.prototype.constructor = CanvasTexture;
CanvasTexture.prototype.isCanvasTexture = true;

/**
 * Draw a placeholder figure into the canvas texture.
 * 
 * @method placeholder
 */
CanvasTexture.prototype.placeholder = function()
{	
	this.context.fillStyle = "#000000";
	this.context.fillRect(0, 0, this.width, this.height);
	this.context.font = "Normal " + Math.round(this.width / 12) + "px Arial";
	this.context.textAlign = "center";
	this.context.fillStyle = "#FF0000";
	this.context.fillText("Canvas Texture", this.width/2, this.height/2);
	this.needsUpdate = true;
};

/**
 * Clear canvas texture with a background color.
 *
 * Uses the internal context to draw a rect to fill the canvas.
 *
 * @method clear
 * @param {string} color
 */
CanvasTexture.prototype.clear = function(color)
{
	if (color === undefined)
	{
		this.context.clearRect(0, 0, width, height);
	}
	else
	{
		this.context.fillStyle = color;
		this.context.fillRect(0, 0, this.width, this.height);
	}
};

/**
 * Create JSON description for canvas texture, canvas image is not serialized.
 * 
 * @param {Object} meta
 * @method toJSON
 */
CanvasTexture.prototype.toJSON = function(meta)
{
	var data = Texture.prototype.toJSON.call(this, meta);

	data.width = this.width;
	data.height = this.height;

	return data;
};
export {CanvasTexture};
