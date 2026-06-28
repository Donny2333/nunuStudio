import {Locale} from "../../../../../locale/LocaleManager.js";
import {ChangeAction} from "../../../../../history/action/ChangeAction.js";
import {CallbackAction} from "../../../../../history/action/CallbackAction.js";
import {ObjectInspector} from "../ObjectInspector.js";
import {Editor} from "../../../../../Editor.js";
import {Slider} from "../../../../../components/input/Slider.js";
import {NumberBox} from "../../../../../components/input/NumberBox.js";
import {DropdownList} from "../../../../../components/input/DropdownList.js";
import {CheckBox} from "../../../../../components/input/CheckBox.js";

function SkyInspector(parent, object)
{
	ObjectInspector.call(this, parent, object);

	var self = this;

	function updateSky()
	{
		self.object.updateSky();
	}

	// Atmosphere
	this.form.addText("Atmosphere");
	this.form.nextRow();

	// Longitude
	this.form.addText("Longitude");
	this.longitude = new NumberBox(this.form);
	this.longitude.size.set(80, 18);
	this.longitude.setStep(0.1);
	this.longitude.setRange(-180, 180);
	this.longitude.setOnChange(function()
	{
		Editor.addAction(new CallbackAction(new ChangeAction(self.object, "longitude", self.longitude.getValue()), updateSky));
	});
	this.form.add(this.longitude);
	this.form.nextRow();

	// Latitude
	this.form.addText("Latitude");
	this.latitude = new NumberBox(this.form);
	this.latitude.size.set(80, 18);
	this.latitude.setStep(0.1);
	this.latitude.setRange(-90, 90);
	this.latitude.setOnChange(function()
	{
		Editor.addAction(new CallbackAction(new ChangeAction(self.object, "latitude", self.latitude.getValue()), updateSky));
	});
	this.form.add(this.latitude);
	this.form.nextRow();

	// Sun intensity
	this.form.addText(Locale.intensity);
	this.intensity = new Slider(this.form);
	this.intensity.size.set(160, 18);
	this.intensity.setStep(0.1);
	this.intensity.setRange(0, 20);
	this.intensity.setOnChange(function()
	{
		Editor.addAction(new CallbackAction(new ChangeAction(self.object, "intensity", self.intensity.getValue()), updateSky));
	});
	this.form.add(this.intensity);
	this.form.nextRow();

	// Clouds
	this.form.addText("Clouds");
	this.form.nextRow();

	// Enable
	this.form.addText("Enable");
	this.cloudsEnabled = new CheckBox(this.form);
	this.cloudsEnabled.size.set(18, 18);
	this.cloudsEnabled.setOnChange(function()
	{
		Editor.addAction(new ChangeAction(self.object, "cloudsEnabled", self.cloudsEnabled.getValue()));
	});
	this.form.add(this.cloudsEnabled);
	this.form.nextRow();

	// Cloud coverage
	this.form.addText("Coverage");
	this.coverage = new Slider(this.form);
	this.coverage.size.set(160, 18);
	this.coverage.setStep(0.01);
	this.coverage.setRange(0, 1);
	this.coverage.setOnChange(function()
	{
		Editor.addAction(new ChangeAction(self.object, "coverage", self.coverage.getValue()));
	});
	this.form.add(this.coverage);
	this.form.nextRow();

	// Cloud animate
	this.form.addText("Animate");
	this.cloudsAnimate = new CheckBox(this.form);
	this.cloudsAnimate.size.set(18, 18);
	this.cloudsAnimate.setOnChange(function()
	{
		Editor.addAction(new ChangeAction(self.object, "cloudsAnimate", self.cloudsAnimate.getValue()));
	});
	this.form.add(this.cloudsAnimate);
	this.form.nextRow();

	// Cloud animate speed
	this.form.addText("Speed");
	this.cloudsAnimateSpeed = new Slider(this.form);
	this.cloudsAnimateSpeed.size.set(160, 18);
	this.cloudsAnimateSpeed.setStep(0.001);
	this.cloudsAnimateSpeed.setRange(-0.05, 0.05);
	this.cloudsAnimateSpeed.setOnChange(function()
	{
		Editor.addAction(new ChangeAction(self.object, "cloudsAnimateSpeed", self.cloudsAnimateSpeed.getValue()));
	});
	this.form.add(this.cloudsAnimateSpeed);
	this.form.nextRow();

	// Day time animation
	this.form.addText("Day Time");
	this.form.nextRow();

	// Auto update
	this.form.addText(Locale.autoUpdate);
	this.autoUpdate = new CheckBox(this.form);
	this.autoUpdate.size.set(18, 18);
	this.autoUpdate.setOnChange(function()
	{
		Editor.addAction(new ChangeAction(self.object, "autoUpdate", self.autoUpdate.getValue()));
	});
	this.form.add(this.autoUpdate);
	this.form.nextRow();

	// Day duration
	this.form.addText("Day duration");
	this.dayTime = new NumberBox(this.form);
	this.dayTime.size.set(60, 18);
	this.dayTime.setStep(0.1);
	this.dayTime.setOnChange(function()
	{
		var dayTime = self.dayTime.getValue();
		if (dayTime < 0)
		{
			dayTime = 0;
			self.dayTime.setValue(dayTime);
		}
		Editor.addAction(new ChangeAction(self.object, "dayTime", dayTime));

		if (self.object.time > dayTime)
		{
			Editor.addAction(new ChangeAction(self.object, "time", dayTime));
			self.time.setValue(dayTime);
		}

		self.time.setRange(0, dayTime);
		self.object.updateSky();
	});
	this.form.add(this.dayTime);
	this.form.addText("s", true);
	this.form.nextRow();

	// Current time
	this.form.addText(Locale.time);
	this.time = new NumberBox(this.form);
	this.time.size.set(60, 18);
	this.time.setStep(0.1);
	this.time.setOnChange(function()
	{
		var time = self.time.getValue();

		if (time < 0)
		{
			time = 0;
			self.time.setValue(time);
		}
		else if (time > self.object.dayTime)
		{
			time = self.object.dayTime;
			self.time.setValue(time);
		}

		Editor.addAction(new ChangeAction(self.object, "time", time));
		self.object.updateSky();
	});
	this.form.add(this.time);
	this.form.addText("s", true);
	this.form.nextRow();

	// Shadow map
	this.form.addText(Locale.shadows);
	this.form.nextRow();

	// Cast shadow
	this.castShadow = new CheckBox(this.form);
	this.form.addText(Locale.castShadows);
	this.castShadow.size.set(18, 18);
	this.castShadow.setOnChange(function()
	{
		Editor.addAction(new ChangeAction(self.object.sun, "castShadow", self.castShadow.getValue()));
	});
	this.form.add(this.castShadow);
	this.form.nextRow();

	// Shadow resolution
	this.form.addText(Locale.resolution);
	this.shadowWidth = new DropdownList(this.form);
	this.shadowWidth.size.set(60, 18);
	this.shadowWidth.setOnChange(function()
	{
		Editor.addAction(new ChangeAction(self.object.sun.shadow.mapSize, "width", self.shadowWidth.getValue()));
		SkyInspector.updateShadowMap(self.object.sun);
	});
	this.form.add(this.shadowWidth);
	this.form.addText("x", true);
	this.shadowHeight = new DropdownList(this.form);
	this.shadowHeight.size.set(60, 18);
	this.shadowHeight.setOnChange(function()
	{
		Editor.addAction(new ChangeAction(self.object.sun.shadow.mapSize, "height", self.shadowHeight.getValue()));
		SkyInspector.updateShadowMap(self.object.sun);
	});
	this.form.add(this.shadowHeight);
	this.form.nextRow();

	for (var i = 5; i < 13; i++)
	{
		var size = Math.pow(2, i);
		this.shadowWidth.addValue(size.toString(), size);
		this.shadowHeight.addValue(size.toString(), size);
	}

	// Shadow camera near
	this.form.addText(Locale.near);
	this.shadowNear = new NumberBox(this.form);
	this.shadowNear.size.set(60, 18);
	this.shadowNear.setStep(0.1);
	this.shadowNear.setOnChange(function()
	{
		Editor.addAction(new ChangeAction(self.object.sun.shadow.camera, "near", self.shadowNear.getValue()));
		SkyInspector.updateShadowMap(self.object.sun);
	});
	this.form.add(this.shadowNear);
	this.form.nextRow();

	// Shadow camera far
	this.form.addText(Locale.far);
	this.shadowFar = new NumberBox(this.form);
	this.shadowFar.size.set(60, 18);
	this.shadowFar.setStep(0.1);
	this.shadowFar.setOnChange(function()
	{
		Editor.addAction(new ChangeAction(self.object.sun.shadow.camera, "far", self.shadowFar.getValue()));
		SkyInspector.updateShadowMap(self.object.sun);
	});
	this.form.add(this.shadowFar);
	this.form.nextRow();
}

SkyInspector.prototype = Object.create(ObjectInspector.prototype);

SkyInspector.updateShadowMap = function(light)
{
	if (light.shadow.map)
	{
		light.shadow.map.dispose();
		light.shadow.map = null;
	}
	light.shadow.camera.updateProjectionMatrix();
};

SkyInspector.prototype.updateInspector = function()
{
	ObjectInspector.prototype.updateInspector.call(this);

	this.longitude.setValue(this.object.longitude);
	this.latitude.setValue(this.object.latitude);
	this.intensity.setValue(this.object.intensity);

	this.cloudsEnabled.setValue(this.object.cloudsEnabled);
	this.coverage.setValue(this.object.coverage);
	this.cloudsAnimate.setValue(this.object.cloudsAnimate);
	this.cloudsAnimateSpeed.setValue(this.object.cloudsAnimateSpeed);

	this.autoUpdate.setValue(this.object.autoUpdate);
	this.dayTime.setValue(this.object.dayTime);
	this.time.setValue(this.object.time);

	this.castShadow.setValue(this.object.sun.castShadow);
	this.shadowWidth.setValue(this.object.sun.shadow.mapSize.width);
	this.shadowHeight.setValue(this.object.sun.shadow.mapSize.height);
	this.shadowNear.setValue(this.object.sun.shadow.camera.near);
	this.shadowFar.setValue(this.object.sun.shadow.camera.far);
};

export {SkyInspector};
