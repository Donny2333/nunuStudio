import createLayout from "layout-bmfont-text";
import createIndices from "quad-indices";
import vertices from "three-bmfont-text/lib/vertices";
import utils from "three-bmfont-text/lib/utils";

var Base = THREE.BufferGeometry;

export default function createTextGeometry(opt)
{
	return new TextGeometry(opt);
};

function TextGeometry(opt)
{
	var instance = Reflect.construct(Base, [], new.target || TextGeometry);

	if (typeof opt === "string")
	{
		opt = {text: opt};
	}

	instance._opt = Object.assign({}, opt);

	if (opt) { instance.update(opt); }

	return instance;
}

TextGeometry.prototype = Object.create(Base.prototype);

TextGeometry.prototype.update = function(opt)
{
	if (typeof opt === "string")
	{
		opt = {text: opt};
	}

	opt = Object.assign({}, this._opt, opt);

	if (!opt.font)
	{
		throw new TypeError("must specify a { font } in options");
	}

	this.layout = createLayout(opt);

	var flipY = opt.flipY !== false;
	var font = opt.font;
	var texWidth = font.common.scaleW;
	var texHeight = font.common.scaleH;

	var glyphs = this.layout.glyphs.filter(function(glyph)
	{
		var bitmap = glyph.data;
		return bitmap.width * bitmap.height > 0;
	});

	this.visibleGlyphs = glyphs;

	var positions = vertices.positions(glyphs);
	var uvs = vertices.uvs(glyphs, texWidth, texHeight, flipY);
	var indices = createIndices([], {
		clockwise: true,
		type: "uint16",
		count: glyphs.length
	});

	this.setIndex(indices);
	this.setAttribute("position", new THREE.BufferAttribute(positions, 2));
	this.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

	if (!opt.multipage && "page" in this.attributes)
	{
		this.removeAttribute("page");
	}
	else if (opt.multipage)
	{
		var pages = vertices.pages(glyphs);
		this.setAttribute("page", new THREE.BufferAttribute(pages, 1));
	}
};

TextGeometry.prototype.computeBoundingSphere = function()
{
	if (this.boundingSphere === null)
	{
		this.boundingSphere = new THREE.Sphere();
	}

	var positions = this.attributes.position.array;
	var itemSize = this.attributes.position.itemSize;
	if (!positions || !itemSize || positions.length < 2)
	{
		this.boundingSphere.radius = 0;
		this.boundingSphere.center.set(0, 0, 0);
		return;
	}
	utils.computeSphere(positions, this.boundingSphere);
};

TextGeometry.prototype.computeBoundingBox = function()
{
	if (this.boundingBox === null)
	{
		this.boundingBox = new THREE.Box3();
	}

	var bbox = this.boundingBox;
	var positions = this.attributes.position.array;
	var itemSize = this.attributes.position.itemSize;
	if (!positions || !itemSize || positions.length < 2)
	{
		bbox.makeEmpty();
		return;
	}
	utils.computeBox(positions, bbox);
};
