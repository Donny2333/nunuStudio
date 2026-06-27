import {Group as TGroup, BufferGeometry, Float32BufferAttribute, Line, LineBasicMaterial, Vector3} from "three";
import {TextSprite} from "../text/TextSprite.js";

/**
 * Measurement object draws a line between two points and displays the distance value.
 *
 * @class Measurement
 * @extends {Group}
 */
function Measurement()
{
	var instance = Reflect.construct(TGroup, [], new.target || Measurement);

	instance.name = "measurement";
	instance.type = "Measurement";

	instance.start = new Vector3(0, 0, 0);
	instance.end = new Vector3(1, 0, 0);
	instance.precision = 2;

	instance._startWorld = new Vector3();
	instance._endWorld = new Vector3();
	instance._midpoint = new Vector3();
	instance._lastDistance = -1;

	var geometry = new BufferGeometry();
	geometry.setAttribute("position", new Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3));
	instance.line = new Line(geometry, new LineBasicMaterial({color: 0xFFFF00}));
	instance.line.frustumCulled = false;
	instance.line.locked = true;
	instance.line.name = "line";
	instance.add(instance.line);

	instance.label = new TextSprite();
	instance.label.name = "label";
	instance.label.locked = true;
	instance.label.sizeAttenuation = false;
	instance.label.color = "#000000";
	instance.label.font = "arial";
	instance.label.resolution = 128;
	instance.label.outline = false;
	instance.label.material.depthTest = false;
	instance.label.material.depthWrite = false;
	instance.label.material.needsUpdate = true;
	instance.label.scale.setScalar(0.03);
	instance.add(instance.label);

	instance.updateGeometry();

	return instance;
}

Measurement.prototype = Object.create(TGroup.prototype);
Measurement.prototype.constructor = Measurement;

Measurement.prototype.setPoints = function(start, end)
{
	this.position.copy(start);
	this.start.set(0, 0, 0);
	this.end.copy(end).sub(start);
	this._lastDistance = -1;
	this.updateGeometry();
};

Measurement.prototype.setLocalPoints = function(start, end)
{
	this.start.copy(start);
	this.end.copy(end);
	this._lastDistance = -1;
	this.updateGeometry();
};

Measurement.prototype.updateGeometry = function()
{
	var position = this.line.geometry.attributes.position;
	position.setXYZ(0, this.start.x, this.start.y, this.start.z);
	position.setXYZ(1, this.end.x, this.end.y, this.end.z);
	position.needsUpdate = true;
	this.line.geometry.computeBoundingSphere();

	this._midpoint.copy(this.start).add(this.end).multiplyScalar(0.5);
	this.label.position.copy(this._midpoint);

	this.updateLabel();
};

Measurement.prototype.updateLabel = function()
{
	this._startWorld.copy(this.start);
	this.localToWorld(this._startWorld);
	this._endWorld.copy(this.end);
	this.localToWorld(this._endWorld);

	var distance = this._startWorld.distanceTo(this._endWorld);

	if (this._lastDistance < 0 || Math.abs(this._lastDistance - distance) > 1e-4)
	{
	        this._lastDistance = distance;
	        this.label.text = distance.toFixed(this.precision);
	}
};

Measurement.prototype.updateMatrixWorld = function(force)
{
	TGroup.prototype.updateMatrixWorld.call(this, force);
	this.updateLabel();
};

Measurement.prototype.toJSON = function(meta)
{
	var data = TGroup.prototype.toJSON.call(this, meta);

	data.object.start = this.start.toArray();
	data.object.end = this.end.toArray();
	data.object.precision = this.precision;
	data.object.children = [];

	return data;
};

Measurement.fromJSON = function(data)
{
	var measurement = new Measurement();
	measurement.precision = data.precision !== undefined ? data.precision : 2;

	var start = new Vector3();
	var end = new Vector3(1, 0, 0);

	if (data.start !== undefined)
	{
	        start.fromArray(data.start);
	}

	if (data.end !== undefined)
	{
	        end.fromArray(data.end);
	}

	measurement.setLocalPoints(start, end);

	return measurement;
};

export {Measurement};
