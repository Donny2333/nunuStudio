import {REVISION} from "three";
import {IStudio} from "../../IStudio.js";

// Serialization handles image data via imageResource when available,
// falls back to encoding texture.image as base64 data URL.
THREE.Texture.prototype.toJSON = function(meta)
{
	// Check if this texture was already serialized
	if (meta.textures[this.uuid] !== undefined)
	{
		return meta.textures[this.uuid];
	}

	// Serialize texture data
	var data =
	{
		metadata:
		{
			version: REVISION,
			type: "Texture"
		},

		uuid: this.uuid,
		name: this.name,
		category: this.category,

		mapping: this.mapping,

		repeat: [this.repeat.x, this.repeat.y],
		offset: [this.offset.x, this.offset.y],
		center: [this.center.x, this.center.y],
		rotation: this.rotation,

		wrap: [this.wrapS, this.wrapT],

		format: this.format,
		type: this.type,
		colorSpace: this.colorSpace,

		minFilter: this.minFilter,
		magFilter: this.magFilter,
		anisotropy: this.anisotropy,

		flipY: this.flipY,

		premultiplyAlpha: this.premultiplyAlpha,
		unpackAlignment: this.unpackAlignment
	};

	// Serialize image data when no imageResource exists (e.g. FBX embedded textures)
	if (!this.imageResource && this.image)
	{
		if (this.image instanceof HTMLImageElement || this.image instanceof HTMLCanvasElement)
		{
			var canvas = document.createElement("canvas");
			canvas.width = this.image.width || this.image.naturalWidth;
			canvas.height = this.image.height || this.image.naturalHeight;
			var ctx = canvas.getContext("2d");
			ctx.drawImage(this.image, 0, 0);
			data.image = canvas.toDataURL("image/png");
		}
		else if (this.image.data)
		{
			data.image = {data: Array.from(this.image.data), width: this.image.width, height: this.image.height};
		}
	}

	meta.textures[this.uuid] = data;

	return data;
};
