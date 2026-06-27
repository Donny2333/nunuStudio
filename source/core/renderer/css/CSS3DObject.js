import {Object3D} from "three";

/**
 * CSS 3D element projected in the 3D scene.
 *
 * Encapsulated a DOM element that is projected into 3D space using the 3D object transform values.
 *
 * CSS3D object always stay above everything elese in the 3D scene.
 *
 * @class CSS3DObject
 * @extends {Object3D}
 * @param {Component} element DOM element encapsulated in the object container.
 */
function CSS3DObject(element)
{
	var instance = Reflect.construct(Object3D, [], new.target || CSS3DObject);

	/**
	 * The DOM element to be projected in 3D space.
	 *
	 * It is automatically added to the appropiate DOM container used by the renderer.
	 *
	 * @attribute element
	 * @type {Element}
	 */
	instance.element = element;
	instance.element.style.position = "absolute";
	
	instance.addEventListener("removed", function()
	{
		if (instance.element.parentNode !== null)
		{
			instance.element.parentNode.removeChild(instance.element);
		}
	});

	var self = this;
	var visible = true;
	Object.defineProperties(this,
		{
			visible:
		{
			get: function()
			{
				return visible;
			},
			set: function(value)
			{
				visible = value;
				
				self.element.style.display = value ? "block" :"none";
			}
		}
		});

	return instance;
};

CSS3DObject.prototype = Object.create(Object3D.prototype);
CSS3DObject.prototype.constructor = CSS3DObject;
CSS3DObject.prototype.isCSS3DObject = true;

export {CSS3DObject};
