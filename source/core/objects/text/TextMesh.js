import {BufferGeometry, ExtrudeGeometry, ShapeGeometry, Object3D} from "three";
import {Font} from "three/examples/jsm/loaders/FontLoader.js";
import {Mesh} from "../mesh/Mesh.js";

/**
 * Special mesh type used to draw 3D text.
 *
 * It receives a Font resource that is used to triangulate and extrude font data into a 3D mesh.
 *
 * @class TextMesh
 * @module Meshes
 * @param {string} text Text to be draw
 * @param {Material} material Material used to shade the surface of the geometry
 * @param {Font} font Font
 * @param {number} height Text height
 * @param {boolean} bevel
 * @param {number} bevelThickness
 * @param {number} bevelSize
 * @param {number} size
 * @param {number} curveSegments
 * @param {boolean} extruded
 * @extends {Mesh}
 */
function TextMesh(text, material, font, height, bevel, bevelThickness, bevelSize, size, curveSegments, extruded)
{
	var instance = Reflect.construct(Mesh, [TextMesh.EMPTY_GEOMETRY, material], new.target || TextMesh);

	instance.name = "text";
	instance.type = "TextMesh";

	/**
	 * Font used to draw text.
	 *
	 * @property font
	 * @type {Font}
	 */
	instance.font = font !== undefined ? font : null;

	/**
	 * Indicates if the text mesh has volume or not.
	 *
	 * @property extruded
	 * @type {boolean}
	 */
	instance.extruded = extruded !== undefined ? extruded : true;

	/**
	 * Size of the text (depth).
	 *
	 * @property size
	 * @type {number}
	 */
	instance.size = size !== undefined ? size : 1;

	/**
	 * Height of the text.
	 *
	 * @property height
	 * @type {number}
	 */
	instance.height = height !== undefined ? height : 0.5;

	/**
	 * Number of segments that compose a curve in the font.
	 *
	 * @property curveSegments
	 * @type {number}
	 */
	instance.curveSegments = curveSegments !== undefined ? curveSegments : 15;

	/**
	 * If true a bevel is added to the text.
	 *
	 * @property bevel
	 * @type {boolean}
	 */
	instance.bevel = bevel !== undefined ? bevel : false;

	/**
	 * Bevel thickness.
	 *
	 * @property bevelThickness
	 * @type {number}
	 */
	instance.bevelThickness = bevelThickness !== undefined ? bevelThickness : 0.1;

	/**
	 * Bevel size.
	 *
	 * @property bevelSize
	 * @type {number}
	 */
	instance.bevelSize = bevelSize !== undefined ? bevelSize : 0.05;

	/**
	 * Text to be diplayed in the mesh.
	 *
	 * @property text
	 * @type {string}
	 */
	if (text !== undefined)
	{
		text = "text";
	}
	Object.defineProperties(this,
		{
			text:
		{
			get: function() {return text;},
			set: function(value)
			{
				if (text !== value)
				{
					text = value;
					instance.updateGeometry();
				}
			}
		}
		});

	instance.updateGeometry();

	return instance;
}

TextMesh.prototype = Object.create(Mesh.prototype);

TextMesh.EMPTY_GEOMETRY = new BufferGeometry();

/**
 * Set font used by this text 3D instance.
 *
 * @param {Font} font Font
 * @method setFont
 */
TextMesh.prototype.setFont = function(font)
{
	if (this.font !== font)
	{
		this.font = font;
		this.updateGeometry();
	}
};

/**
 * Change text.
 *
 * @param {string} text
 * @method setText
 */
TextMesh.prototype.setText = function(text)
{
	this.text = text;
};

/**
 * Update the text geometry.
 *
 * Should be called after chaging any attribute to generate a new geometry.
 *
 * @method updateGeometry
 */
TextMesh.prototype.updateGeometry = function()
{
	if (this.font !== null)
	{
		if (this.geometry !== undefined)
		{
			this.geometry.dispose();
		}

		if (this.font.isFont !== true)
		{
			console.warn("iStudio: Font parameter is not an instance of Font.");
			this.geometry = TextMesh.EMPTY_GEOMETRY;
			return;
		}

		var shapes = this.font.generateShapes(this.text, this.size);

		if (this.extruded)
		{
			this.geometry = new ExtrudeGeometry(shapes,
				{
					curveSegments: this.curveSegments,
					depth: this.height,
					bevelEnabled: this.bevel,
					bevelSize: this.bevelSize,
					bevelThickness: this.bevelThickness
				});
			this.geometry.computeVertexNormals();
		}
		else
		{
			this.geometry = new ShapeGeometry(shapes, this.curveSegments);
		}
	}
};

/**
 * Clone this object instance into a new object.
 *
 * @method clone
 * @return {TextMesh} Clone of this object.
 */
TextMesh.prototype.clone = function()
{
	return new TextMesh(this.text, this.material, this.font, this.height, this.bevel, this.bevelThickness, this.bevelSize, this.size, this.curveSegments);
};

/**
 * Create JSON for object.
 *
 * Need to backup geometry and set to undefined to avoid it being stored.
 *
 * @method toJSON
 * @param {Object} meta
 * @return {Object} json
 */
TextMesh.prototype.toJSON = function(meta)
{
	var geometry = this.geometry;
	this.geometry = undefined;

	var font = this.font;

	var data = Object3D.prototype.toJSON.call(this, meta, function(meta, object)
	{
		font = font.toJSON(meta);
	});

	data.object.text = this.text;
	data.object.font = font.uuid;
	data.object.size = this.size;
	data.object.curveSegments = this.curveSegments;
	data.object.height = this.height;
	data.object.bevel = this.bevel;
	data.object.bevelThickness = this.bevelThickness;
	data.object.bevelSize = this.bevelSize;
	data.object.extruded = this.extruded;

	this.geometry = geometry;

	return data;
};

export {TextMesh};
