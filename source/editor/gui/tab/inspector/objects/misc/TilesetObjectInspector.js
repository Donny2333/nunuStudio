import {ChangeAction} from "../../../../../history/action/ChangeAction.js";
import {Editor} from "../../../../../Editor.js";
import {TextBox} from "../../../../../components/input/TextBox.js";
import {NumberBox} from "../../../../../components/input/NumberBox.js";
import {Slider} from "../../../../../components/input/Slider.js";
import {CheckBox} from "../../../../../components/input/CheckBox.js";
import {ButtonText} from "../../../../../components/buttons/ButtonText.js";
import {ObjectInspector} from "../ObjectInspector.js";
import {SceneEditor} from "../../../scene-editor/SceneEditor.js";

function TilesetObjectInspector(parent, object)
{
	ObjectInspector.call(this, parent, object);

	var self = this;

	// URL
	this.form.addText("Tile URL");
	this.url = new TextBox(this.form);
	this.url.size.set(0, 18);
	this.url.setOnChange(function()
	{
		Editor.addAction(new ChangeAction(self.object, "url", self.url.getText()));
	});
	this.form.add(this.url);
	this.form.nextRow();

	// Center Latitude
	this.form.addText("Latitude");
	this.lat = new NumberBox(this.form);
	this.lat.size.set(0, 18);
	this.lat.setStep(0.001);
	this.lat.setOnChange(function()
	{
		Editor.addAction(new ChangeAction(self.object, "centerLat", self.lat.getValue()));
	});
	this.form.add(this.lat);
	this.form.nextRow();

	// Center Longitude
	this.form.addText("Longitude");
	this.lon = new NumberBox(this.form);
	this.lon.size.set(0, 18);
	this.lon.setStep(0.001);
	this.lon.setOnChange(function()
	{
		Editor.addAction(new ChangeAction(self.object, "centerLon", self.lon.getValue()));
	});
	this.form.add(this.lon);
	this.form.nextRow();

	// Zoom level
	this.form.addText("Zoom");
	this.zoom = new NumberBox(this.form);
	this.zoom.size.set(0, 18);
	this.zoom.setStep(1);
	this.zoom.setRange(1, 18);
	this.zoom.setOnChange(function()
	{
		Editor.addAction(new ChangeAction(self.object, "zoom", self.zoom.getValue()));
	});
	this.form.add(this.zoom);
	this.form.nextRow();

	// Error Target (controls tile LOD detail)
	this.form.addText("Error Target");
	this.errorTarget = new Slider(this.form);
	this.errorTarget.size.set(0, 18);
	this.errorTarget.setRange(1, 40);
	this.errorTarget.setStep(1);
	this.errorTarget.setOnChange(function()
	{
		var value = self.errorTarget.getValue();
		Editor.addAction(new ChangeAction(self.object, "errorTarget", value));
		if (self.object._tiles)
		{
			self.object._tiles.errorTarget = value;
			self.object._tiles.dispatchEvent({type: "needs-update"});
		}
	});
	this.form.add(this.errorTarget);
	this.form.nextRow();

	// Labels overlay
	this.form.addText("Labels");
	this.labelsEnabled = new CheckBox(this.form);
	this.labelsEnabled.size.set(18, 18);
	this.labelsEnabled.setOnChange(function()
	{
		var enabled = self.labelsEnabled.getValue();
		Editor.addAction(new ChangeAction(self.object, "labelsEnabled", enabled));
		self.object.loadTiles();
	});
	this.form.add(this.labelsEnabled);
	this.form.nextRow();

	// Load button
	this.load = new ButtonText(this.form);
	this.load.setText("Load Tiles");
	this.load.size.set(100, 18);
	this.load.setOnClick(function()
	{
		self.object.loadTiles();
	});
	this.form.add(this.load);
	this.form.nextRow();

	// Go to Location button - navigates camera above the tileset
	this.goTo = new ButtonText(this.form);
	this.goTo.setText("Go to Location");
	this.goTo.size.set(100, 18);
	this.goTo.setOnClick(function()
	{
		var tabs = Editor.gui.tab.getActiveTab();
		for (var i = 0; i < tabs.length; i++)
		{
			if (tabs[i] instanceof SceneEditor && tabs[i].controls)
			{
				var controls = tabs[i].controls;
				self.object.getWorldPosition(controls.tempVector);
				controls.center.copy(controls.tempVector);
				controls.distance = TilesetObjectInspector.zoomToDistance(self.object.zoom);
				controls.orientation.set(0, Math.PI / 2);
				controls.updateControls();
				break;
			}
		}
	});
	this.form.add(this.goTo);
	this.form.nextRow();
}

TilesetObjectInspector.zoomToDistance = function(zoom)
{
	return 1024 / Math.pow(2, zoom - 14);
};

TilesetObjectInspector.prototype = Object.create(ObjectInspector.prototype);

TilesetObjectInspector.prototype.updateInspector = function()
{
	ObjectInspector.prototype.updateInspector.call(this);

	this.url.setText(this.object.url);
	this.lat.setValue(this.object.centerLat);
	this.lon.setValue(this.object.centerLon);
	this.zoom.setValue(this.object.zoom);
	this.errorTarget.setValue(this.object.errorTarget);
	this.labelsEnabled.setValue(this.object.labelsEnabled);
};

export {TilesetObjectInspector};
