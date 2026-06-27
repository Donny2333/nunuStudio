import {MathUtils, Object3D} from "three";
import {CanvasSprite} from "../sprite/CanvasSprite.js";

/**
 * Text sprite is used to represent text as a sprite.
 * 
 * This approach is memory expensive since it needs to write a new texture for each text. But allows the used to access any font available in the browser.
 *
 * The text is rendered to canvas and then copied to a texture. It automatically ajusts the object scale to match the text aspect.
 * 
 * @class TextSprite
 * @extends {CanvasSprite}
 */
function TextSprite()
{
	var instance = Reflect.construct(CanvasSprite, [], new.target || TextSprite);

	instance.name = "text";
	instance.type = "TextSprite";

	var text = "";
	var color = "#FFFFFF";
	var outline = true;
	var outlineColor = "#000000";
	var outlineWidth = 1;
	var resolution = 32;
	var align = TextSprite.CENTER;
	var font = "arial";

	Object.defineProperties(instance,
		{
			font:
		{
			get: function() {return font;},
			set: function(value) {font = value; instance.drawText();}
		},
			align:
		{
			get: function() {return align;},
			set: function(value) {align = value; instance.drawText();}
		},
			color:
		{
			get: function() {return color;},
			set: function(value) {color = value; instance.drawText();}
		},
			text:
		{
			get: function() {return text;},
			set: function(value)
			{
				if (value !== text)
				{
					text = value;
					instance.drawText();
				}
			}
		},
			outline:
		{
			get: function() {return outline;},
			set: function(value) {outline = value; instance.drawText();}
		},
			outlineColor:
		{
			get: function() {return outlineColor;},
			set: function(value) {outlineColor = value; instance.drawText();}
		},
			outlineWidth:
		{
			get: function() {return outlineWidth;},
			set: function(value) {outlineWidth = value; instance.drawText();}
		},
			resolution:
		{
			get: function() {return resolution;},
			set: function(value) {resolution = value; instance.drawText();}
		}
		});

	instance.text = "text";

	return instance;
}

TextSprite.prototype = Object.create(CanvasSprite.prototype);

/**
 * Align text to the left side.
 *
 * @static
 * @attribute LEFT
 * @type {string}
 */
TextSprite.LEFT = "left";

/**
 * Align text to the center.
 *
 * @static
 * @attribute CENTER
 * @type {string}
 */
TextSprite.CENTER = "center";

/**
 * Align text to the right side.
 *
 * @static
 * @attribute RIGHT
 * @type {string}
 */
TextSprite.RIGHT = "right";

/**
 * Update the canvas texture, redrawText text into the canvas.
 *
 * @method drawText
 */
TextSprite.prototype.drawText = function()
{
	var height = this.resolution;
	var fontSize = height * 0.8;

	var context = this.texture.context;
	context.font = fontSize + "px " + this.font;

	var size = context.measureText(this.text).width;
	var width = MathUtils.ceilPowerOfTwo(size);
	var ratio = width / height;

	this.texture.width = width;
	this.texture.height = height;

	context.clearRect(0, 0, width, height);
	
	if (this.text.length === 0)
	{
		return;
	}

	context.font = fontSize + "px " + this.font;
	context.textAlign = this.align;
	context.textBaseline = "middle";
	context.fillStyle = this.color;
	context.fillText(this.text, width / 2, height / 2);
	
	if (this.outline === true)
	{
		context.lineWidth = this.outlineWidth;
		context.strokeStyle = this.outlineColor;
		context.strokeText(this.text, width / 2, height / 2);
	}

	this.scale.x = ratio * this.scale.y;
	this.texture.needsUpdate = true;
};

TextSprite.prototype.toJSON = function(meta)
{
	var data = Object3D.prototype.toJSON.call(this, meta);

	data.object.text = this.text;
	data.object.color = this.color;
	data.object.outline = this.outline;
	data.object.outlineColor = this.outlineColor;
	data.object.outlineWidth = this.outlineWidth;
	data.object.resolution = this.resolution;
	data.object.align = this.align;
	data.object.font = this.font;

	return data;
};


TextSprite.fromJSON = function(data)
{
	var object = new TextSprite();
	object.text = data.text;
	object.color = data.color;
	object.outline = data.outline;
	object.outlineColor = data.outlineColor;
	object.outlineWidth = data.outlineWidth;
	object.resolution = data.resolution;
	object.align = data.align;
	object.font = data.font;
	
	return object;
};


export {TextSprite};
