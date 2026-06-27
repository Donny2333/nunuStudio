import {LineBasicMaterial} from "three";

/**
 * Basic material to represent the line portions of a gizmo.
 *
 * @class GizmoLineMaterial
 * @extends {LineBasicMaterial}
 */
function GizmoLineMaterial(parameters)
{
	var instance = Reflect.construct(LineBasicMaterial, [], GizmoLineMaterial);

	instance.depthTest = false;
	instance.depthWrite = false;
	instance.transparent = true;
	instance.linewidth = 1;

	instance.setValues(parameters);

	instance.baseColor = instance.color.clone();
	instance.baseOpacity = instance.opacity;

	return instance;
}

GizmoLineMaterial.prototype = Object.create(LineBasicMaterial.prototype);
GizmoLineMaterial.prototype.constructor = GizmoLineMaterial;

Object.defineProperty(GizmoLineMaterial, "type", {get: function() { return "LineBasicMaterial"; }});

GizmoLineMaterial.red = new GizmoLineMaterial({color: 0xff0000});
GizmoLineMaterial.green = new GizmoLineMaterial({color: 0x00ff00});
GizmoLineMaterial.blue = new GizmoLineMaterial({color: 0x0000ff});
GizmoLineMaterial.yellow = new GizmoLineMaterial({color: 0xFFFF00});
GizmoLineMaterial.grey = new GizmoLineMaterial({color: 0x787878});

/**
 * Toggle the highlight state of a gizmo material.
 *
 * @method highlight
 * @param {boolean} highlighted
 */
GizmoLineMaterial.prototype.highlight = function(highlighted)
{
	if (highlighted)
	{
		this.color.setRGB(1.0, 1.0, 0);
		this.opacity = 1.0;
	}
	else
	{
		this.color.copy(this.baseColor);
		this.opacity = this.baseOpacity;
	}
};

export {GizmoLineMaterial};
