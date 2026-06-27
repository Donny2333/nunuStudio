import {CSS3DObject} from "../../renderer/css/CSS3DObject.js";

/**
 * HTMLView object is used to navigate webpages inside of the 3D scene.
 *
 * Can be used to display external web widget using a iframe. Some pages might present limitations regarding their usage inside of a iframe element.
 *
 * @class HTMLView
 * @extends {CSS3DObject}
 * @param {string} url URL to be opened by default.
 */
function HTMLView(url)
{
	var element = document.createElement("iframe");
	element.style.border = "none";

	var instance = Reflect.construct(CSS3DObject, [element], new.target || HTMLView);

	instance.type = "HTMLView";
	instance.name = "webview";

	var _url, width, height;

	Object.defineProperties(instance,
		{
			url:
		{
			get: function() {return _url;},
			set: function(value)
			{
				_url = value !== undefined ? HTMLView.processURL(value) : "";
				instance.element.src = _url;
			}
		},
			width:
		{
			get: function() {return width;},
			set: function(value)
			{
				width = value;
				instance.element.style.width = width + "px";
			}
		},
			height:
		{
			get: function() {return height;},
			set: function(value)
			{
				height = value;
				instance.element.style.height = height + "px";
			}
		}
		});

	instance.width = 1920;
	instance.height = 1080;
	instance.url = url !== undefined ? url : "";

	return instance;
}

HTMLView.prototype = Object.create(CSS3DObject.prototype);
HTMLView.prototype.constructor = HTMLView;

/**
 * Process URL to transform it into embedded URL when possible for common services.
 *
 * @method processURL
 * @param {string} url
 */
HTMLView.processURL = function(url)
{
	// Replace youtube url to use embeded link
	return url.replace("watch?v=", "embed/");
};

HTMLView.prototype.toJSON = function(meta)
{
	var data = CSS3DObject.prototype.toJSON.call(this, meta);

	data.object.height = this.height;
	data.object.width = this.width;
	data.object.url = this.url;

	return data;
};

export {HTMLView};
