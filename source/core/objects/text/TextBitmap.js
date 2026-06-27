import {Mesh, Texture, Color, ShaderMaterial, DoubleSide, Object3D} from "three";
import createTextGeometry from "three-bmfont-text";
import TextBitmapShaderBitmap from "./text_bitmap_bitmap.glsl";
import TextBitmapShaderSDF from "./text_bitmap_sdf.glsl";
import TextBitmapShaderMSDF from "./text_bitmap_msdf.glsl";
import TextBitmapShaderVertex from "./text_bitmap_vertex.glsl";

/**
 * Text bitmap atlas with support for signed distance field data.
 *
 * Input data should be composed of a BMFont file (can be a .fnt, .json. etc) file and a character atlas texture from an image.
 *
 * Font atlas can be generate using the tool http:// www.angelcode.com/products/bmfont/
 *
 * Based on the three-bmfont-text library.
 *  - https:// github.com/Jam3/three-bmfont-text
 *  - https:// github.com/Jam3/load-bmfont
 *
 * @class TextBitmap
 * @extends {Mesh}
 * @param {Object} config Configuration object with all parameters for bmfont.
 * @param {Texture} texture Texture with the image character atlas to be used.
 * @param {number} shader The text rendering shader to be used (Bitmap, SDF, MSDF).
 * @param {number} color Color of the text.
 */
function TextBitmap(config, texture, shader, color)
{
	if (config.font === undefined)
	{
		throw new Error("TextBitmap configuration font is required.");
	}

	if (config.width === undefined) {config.width = 500;}
	if (config.align === undefined) {config.align = TextBitmap.CENTER;}
	if (config.lineHeight === undefined) {config.lineHeight = config.font.common.lineHeight;}
	if (config.letterSpacing === undefined) {config.letterSpacing = 5;}
	if (config.text === undefined) {config.text = "";}

	var _config = config;
	var _uniforms =
	{
		map: {type: "t", value: texture},
		color: {type: "v3", value: new Color(color !== undefined ? color : 0xFFFFFF)},
		smoothing: {type: "f", value: 0.0},
		threshold: {type: "f", value: 0.4}
	};

	var instance = Reflect.construct(Mesh, [createTextGeometry(_config), null], new.target || TextBitmap);

	instance.config = _config;
	instance.uniforms = _uniforms;
	instance.name = "text";
	instance.type = "TextBitmap";

	var _shader = shader !== undefined ? shader : TextBitmap.BITMAP;
	var fontScale = 0.01;

	Object.defineProperties(instance,
		{
			fontScale:
		{
			get: function() {return fontScale;},
			set: function(value) {fontScale = value; this.updateGeometry();}
		},
			shader:
		{
			get: function() {return _shader;},
			set: function(value) {_shader = value; this.updateShader();}
		},
			texture:
		{
			get: function() {return this.uniforms.map.value;},
			set: function(value) {this.uniforms.map.value = value; this.material.needsUpdate = true;}
		},
			font:
		{
			get: function() {return this.config.font;},
			set: function(value) {this.config.font = value; this.updateGeometry();}
		},
			text:
		{
			get: function() {return this.config.text;},
			set: function(value)
			{
				if (this.config.text !== value)
				{
					this.config.text = value;
					this.updateGeometry();
				}
			}
		},
			lineHeight:
		{
			get: function() {return this.config.lineHeight;},
			set: function(value) {this.config.lineHeight = value; this.updateGeometry();}
		},
			letterSpacing:
		{
			get: function() {return this.config.letterSpacing;},
			set: function(value) {this.config.letterSpacing = value; this.updateGeometry();}
		},
			align:
		{
			get: function() {return this.config.align;},
			set: function(value) {this.config.align = value; this.updateGeometry();}
		},
			width:
		{
			get: function() {return this.config.width;},
			set: function(value) {this.config.width = value; this.updateGeometry();}
		},
			color:
		{
			get: function() {return this.uniforms.color.value;},
			set: function(value) {this.uniforms.color.value = value;}
		},
			threshold:
		{
			get: function() {return this.uniforms.threshold.value;},
			set: function(value) {this.uniforms.threshold.value = value;}
		},
			smoothing:
		{
			get: function() {return this.uniforms.smoothing.value;},
			set: function(value) {this.uniforms.smoothing.value = value;}
		}
		});

	instance.updateGeometry();
	instance.updateShader(texture);

	return instance;
}

TextBitmap.prototype = Object.create(Mesh.prototype);
TextBitmap.prototype.constructor = TextBitmap;

/**
 * Simple bitmap font atlas.
 *
 * @static
 * @attribute BITMAP
 * @type {number}
 */
TextBitmap.BITMAP = 100;

/**
 * Single channel signed distance field font atlas.
 *
 * @static
 * @attribute SDF
 * @type {number}
 */
TextBitmap.SDF = 101;

/**
 * Multi channel signed distance field font atlas.
 *
 * @static
 * @attribute MSDF
 * @type {number}
 */
TextBitmap.MSDF = 102;

/**
 * Align text to the left side.
 *
 * @static
 * @attribute LEFT
 * @type {string}
 */
TextBitmap.LEFT = "left";

/**
 * Align text to the center.
 *
 * @static
 * @attribute CENTER
 * @type {string}
 */
TextBitmap.CENTER = "center";

/**
 * Align text to the right side.
 *
 * @static
 * @attribute RIGHT
 * @type {string}
 */
TextBitmap.RIGHT = "right";

/**
 * Set the text to be displayed.
 *
 * @method setText
 * @param {string} text
 */
TextBitmap.prototype.setText = function(text)
{
	this.text = text;
};

/**
 * Update the shader used to draw the bitmap information in the screen.
 *
 * @method updateShader
 */
TextBitmap.prototype.updateShader = function()
{
	var fragmentShader;

	if (this.shader === TextBitmap.SDF)
	{
		fragmentShader = TextBitmapShaderSDF;
	}
	else if (this.shader === TextBitmap.MSDF)
	{
		fragmentShader = TextBitmapShaderMSDF;
	}
	else
	{
		fragmentShader = TextBitmapShaderBitmap;
	}

	this.material = new ShaderMaterial(
		{
			uniforms: this.uniforms,
			fragmentShader: fragmentShader,
			vertexShader: TextBitmapShaderVertex,
			side: DoubleSide,
			transparent: true,
			depthTest: true
		});

	this.material.extensions.derivatives = this.shader === TextBitmap.MSDF;
};


/**
 * Update the text bitmap geometry to match config.
 *
 * Should be called every time after changes to configuration are made.
 *
 * @method updateGeometry
 */
TextBitmap.prototype.updateGeometry = function()
{
	this.geometry.update(this.config);

	if (this.fontScale !== 1.0)
	{
		var position = this.geometry.attributes.position.array;
		for (var i = 0; i < position.length; i++)
		{
			position[i] *= this.fontScale;
		}
	}
};

TextBitmap.prototype.toJSON = function(meta)
{
	var data = Object3D.prototype.toJSON.call(this, meta);

	data.object.texture = this.texture.toJSON(meta).uuid;
	data.object.fontScale = this.fontScale;
	data.object.shader = this.shader;
	data.object.text = this.text;
	data.object.font = this.font;
	data.object.lineHeight = this.lineHeight;
	data.object.letterSpacing = this.letterSpacing;
	data.object.align = this.align;
	data.object.width = this.width;
	data.object.color = this.color;
	data.object.threshold = this.threshold;
	data.object.smoothing = this.smoothing;

	return data;
};

TextBitmap.fromJSON = function(data, texture)
{
	var object = new TextBitmap(data, texture, data.shader);
	object.color = data.color;
	object.threshold = data.threshold;
	object.smoothing = data.smoothing;
	object.fontScale = data.fontScale;
	
	return object;
};

export {TextBitmap};
