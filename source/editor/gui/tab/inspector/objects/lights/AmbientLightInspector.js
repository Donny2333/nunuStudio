import {Color} from "three";
import {Locale} from "../../../../../locale/LocaleManager.js";
import {ChangeAction} from "../../../../../history/action/ChangeAction.js";
import {ObjectInspector} from "../ObjectInspector.js";
import {Editor} from "../../../../../Editor.js";
import {ColorChooser} from "../../../../../components/input/ColorChooser.js";
import {NumberBox} from "../../../../../components/input/NumberBox.js";

function AmbientLightInspector(parent, object)
{
	ObjectInspector.call(this, parent, object);

	var self = this;

	// Color
	this.form.addText(Locale.color);
	this.color = new ColorChooser(this.form);
	this.color.size.set(80, 18);
	this.color.setOnChange(function()
	{
		Editor.addAction(new ChangeAction(self.object, "color", new Color(self.color.getValueHex())));
	});
	this.form.add(this.color);
	this.form.nextRow();

	// Intensity
	this.form.addText(Locale.intensity);
	this.intensity = new NumberBox(this.form);
	this.intensity.size.set(60, 18);
	this.intensity.setStep(0.1);
	this.intensity.setOnChange(function()
	{
		Editor.addAction(new ChangeAction(self.object, "intensity", self.intensity.getValue()));
	});
	this.form.add(this.intensity);
	this.form.nextRow();
}

AmbientLightInspector.prototype = Object.create(ObjectInspector.prototype);

AmbientLightInspector.prototype.updateInspector = function()
{
	ObjectInspector.prototype.updateInspector.call(this);
	
	this.color.setValue(this.object.color.r, this.object.color.g, this.object.color.b);
	this.intensity.setValue(this.object.intensity);
};

export {AmbientLightInspector};
