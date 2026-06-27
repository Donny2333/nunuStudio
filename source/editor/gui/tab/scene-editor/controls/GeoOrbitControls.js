import {Vector3, Vector2, Matrix4, MathUtils as TMath} from "three";
import {GeoUtils} from "../../../../../core/geo/GeoUtils.js";
import {Mouse} from "../../../../../core/input/Mouse.js";
import {Editor} from "../../../../Editor.js";
import {EditorControls} from "./EditorControls.js";

/**
 * Geographic orbit controls for navigating by longitude/latitude.
 *
 * The camera orbits around a geographic center point (lng/lat mapped to scene XZ).
 * Height is linked to zoom level for intuitive map navigation.
 *
 * @class GeoOrbitControls
 * @extends {EditorControls}
 */
function GeoOrbitControls()
{
	var instance = Reflect.construct(EditorControls, [], new.target || GeoOrbitControls);

	instance.lng = 116.4;
	instance.lat = 39.9;
	instance.height = 500;
	instance.orientation = new Vector2(-0.4, 0.6);
	instance.minHeight = 10;
	instance.maxHeight = 50000;
	instance.needsUpdate = false;

	instance.tempVector = new Vector3();
	instance.tempMatrix = new Matrix4();

	instance.updateControls();

	return instance;
}

GeoOrbitControls.UP = new Vector3(0, 1, 0);

GeoOrbitControls.prototype = Object.create(EditorControls.prototype);

GeoOrbitControls.prototype.reset = function()
{
	this.lng = 116.4;
	this.lat = 39.9;
	this.height = 500;
	this.orientation.set(-0.4, 0.6);
	this.updateControls();
};

GeoOrbitControls.prototype.goToLocation = function(lng, lat, height)
{
	this.lng = lng;
	this.lat = lat;
	if (height !== undefined)
	{
		this.height = height;
	}
	this.updateControls();
};

GeoOrbitControls.prototype.focusObject = function(object)
{
	object.getWorldPosition(this.tempVector);
	this.height = Math.max(this.minHeight, this.tempVector.y + 100);
	this.updateControls();
};

GeoOrbitControls.prototype.update = function(mouse, keyboard)
{
	this.needsUpdate = false;

	if (mouse.buttonPressed(Mouse.LEFT))
	{
		this.orientation.y += Editor.settings.editor.mouseLookSensitivity * mouse.delta.y;
		this.orientation.x -= Editor.settings.editor.mouseLookSensitivity * mouse.delta.x;
		this.needsUpdate = true;
	}

	if (mouse.buttonPressed(Mouse.RIGHT))
	{
		var scale = this.height * 0.001;
		this.lng -= mouse.delta.x * scale * Editor.settings.editor.mouseLookSensitivity;
		this.lat += mouse.delta.y * scale * Editor.settings.editor.mouseLookSensitivity;
		this.lat = TMath.clamp(this.lat, -85, 85);
		this.needsUpdate = true;
	}

	if (mouse.wheel !== 0)
	{
		this.height += mouse.wheel * this.height * Editor.settings.editor.mouseWheelSensitivity;
		this.height = TMath.clamp(this.height, this.minHeight, this.maxHeight);
		this.needsUpdate = true;
	}

	if (this.needsUpdate)
	{
		this.updateControls();
	}
};

GeoOrbitControls.prototype.updateControls = function()
{
	if (this.orientation.y < 0.1)
	{
		this.orientation.y = 0.1;
	}
	else if (this.orientation.y > 1.5)
	{
		this.orientation.y = 1.5;
	}

	var cos = this.height * Math.cos(this.orientation.y);
	var camOffset = new Vector3(
		Math.cos(this.orientation.x) * cos,
		this.height * Math.sin(this.orientation.y),
		Math.sin(this.orientation.x) * cos
	);

	var center = new Vector3(0, 0, 0);
	this.position.copy(center).add(camOffset);

	this.tempMatrix.lookAt(this.position, center, GeoOrbitControls.UP);
	this.quaternion.setFromRotationMatrix(this.tempMatrix);

	this.updateMatrixWorld(true);
};

export {GeoOrbitControls};
