import {Group, Mesh, PlaneGeometry, Vector3, Matrix4, Object3D} from "three";
import {Geodetic, Ellipsoid} from "@takram/three-geospatial";
import {SkyMaterial, SunDirectionalLight, SkyLightProbe, PrecomputedTexturesGenerator, getSunDirectionECEF, getMoonDirectionECEF} from "@takram/three-atmosphere";
import {AtmospherePass} from "../../postprocessing/pass/AtmospherePass.js";

var _sunDirection = new Vector3();
var _moonDirection = new Vector3();
var _ecefPosition = new Vector3();
var _worldToECEF = new Matrix4();

/**
 * Sky object using physically-based atmospheric scattering via @takram/three-atmosphere.
 *
 * Renders a realistic sky dome with accurate sun/moon positions based on date, longitude and latitude.
 * Includes a SunDirectionalLight for sunlight and a SkyLightProbe for ambient sky illumination.
 *
 * @param {boolean} autoUpdate If true, sky auto-updates its time each frame
 * @param {number} dayTime Day duration in seconds (for time-lapse animation)
 * @param {number} time Starting time offset in seconds
 * @class Sky
 * @extends {Group}
 * @module Lights
 */
function Sky(autoUpdate, dayTime, time)
{
	var instance = Reflect.construct(Group, [], new.target || Sky);

	instance.name = "sky";
	instance.type = "Sky";

	/**
	 * If true, sky auto-updates its time each frame.
	 *
	 * @property autoUpdate
	 * @type {boolean}
	 * @default true
	 */
	instance.autoUpdate = autoUpdate !== undefined ? autoUpdate : true;

	/**
	 * Day duration in seconds for time-lapse animation.
	 *
	 * @property dayTime
	 * @type {number}
	 * @default 120
	 */
	instance.dayTime = dayTime !== undefined ? dayTime : 120;

	/**
	 * Current time offset in seconds within the day cycle.
	 *
	 * @property time
	 * @type {number}
	 * @default 20
	 */
	instance.time = time !== undefined ? time : 20;

	/**
	 * Base date used for sun/moon position calculation.
	 * The time property offsets from this date during animation.
	 *
	 * @property date
	 * @type {Date}
	 */
	instance.date = new Date("2024-06-21T00:00:00Z");

	/**
	 * Observer longitude in degrees.
	 *
	 * @property longitude
	 * @type {number}
	 * @default 116.4
	 */
	instance.longitude = 116.4;

	/**
	 * Observer latitude in degrees.
	 *
	 * @property latitude
	 * @type {number}
	 * @default 39.9
	 */
	instance.latitude = 39.9;

	/**
	 * Sun light intensity multiplier.
	 *
	 * @property intensity
	 * @type {number}
	 * @default 5.0
	 */
	instance.intensity = 5.0;

	/**
	 * Whether volumetric clouds are enabled.
	 *
	 * @property cloudsEnabled
	 * @type {boolean}
	 * @default false
	 */
	instance.cloudsEnabled = true;

	/**
	 * Cloud coverage amount (0 = clear sky, 1 = overcast).
	 *
	 * @property coverage
	 * @type {number}
	 * @default 0.5
	 */
	instance.coverage = 0.5;

	/**
	 * Cloud layer configurations. Array of 4 layers mapped to RGBA texture channels.
	 *
	 * @property cloudLayers
	 * @type {Array}
	 */
	instance.cloudLayers = [
		{channel: "r", altitude: 750, height: 650, densityScale: 0.2, shadow: true},
		{channel: "g", altitude: 1000, height: 1200, densityScale: 0.2, shadow: true},
		{channel: "b", altitude: 7500, height: 500, densityScale: 0.003, shadow: false},
		{channel: "a", altitude: 0, height: 0, densityScale: 0, shadow: false}
	];

	// Sky mesh (full-screen quad rendered via SkyMaterial)
	instance._skyMaterial = new SkyMaterial({sun: true, moon: true, ground: true, correctAltitude: false});

	// Patch fragment shader to add ACES tone mapping + exposure
	// SkyMaterial is a RawShaderMaterial so three.js doesn't inject tone mapping
	instance._skyMaterial.fragmentShader = instance._skyMaterial.fragmentShader.replace(
		"void main() {",
		"uniform float toneMappingExposure;\n" +
		"vec3 ACESFilmicTM(vec3 x) {\n" +
		"  float a = 2.51; float b = 0.03; float c = 2.43; float d = 0.59; float e = 0.14;\n" +
		"  return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);\n" +
		"}\n" +
		"vec3 linearToSRGB(vec3 color) {\n" +
		"  return pow(color, vec3(1.0/2.2));\n" +
		"}\n" +
		"void main() {"
	);
	instance._skyMaterial.fragmentShader = instance._skyMaterial.fragmentShader.replace(
		/}\s*$/,
		"  outputColor.rgb *= toneMappingExposure;\n" +
		"  outputColor.rgb = ACESFilmicTM(outputColor.rgb);\n" +
		"  outputColor.rgb = linearToSRGB(outputColor.rgb);\n" +
		"  outputColor.a = 1.0;\n" +
		"}"
	);
	instance._skyMaterial.uniforms.toneMappingExposure = {value: 10.0};

	instance._skyMesh = new Mesh(new PlaneGeometry(2, 2), instance._skyMaterial);
	instance._skyMesh.frustumCulled = false;
	instance._skyMesh.locked = true;
	instance._skyMesh.name = "atmosphere";
	instance._skyMesh.raycast = function() { return null; };

	instance.add(instance._skyMesh);

	// Sun directional light
	instance.sun = new SunDirectionalLight({distance: 1e5, correctAltitude: false});
	instance.sun.castShadow = true;
	instance.sun.locked = true;
	instance.sun.name = "sunlight";
	instance.add(instance.sun);
	instance.sun.target.name = "sun";
	instance.sun.target.locked = true;
	instance.add(instance.sun.target);

	// Sky light probe for ambient illumination
	instance._skyLightProbe = new SkyLightProbe({correctAltitude: false});
	instance._skyLightProbe.locked = true;
	instance._skyLightProbe.name = "ambient";
	instance.add(instance._skyLightProbe);

	// Precomputed textures generator (initialized with renderer at runtime)
	instance._texturesGenerator = null;
	instance._texturesReady = false;

	// Atmosphere post-processing pass (auto-injected into camera composer)
	instance._atmospherePass = null;

	return instance;
}

Sky.prototype = Object.create(Group.prototype);
Sky.prototype.constructor = Sky;

/**
 * Initialize the sky. Generates precomputed LUT textures using the renderer.
 *
 * @method initialize
 */
Sky.prototype.initialize = function()
{
	this._texturesReady = false;
	this.updateSky();
	Object3D.prototype.initialize.call(this);
};

/**
 * Ensure precomputed textures are generated. Called lazily when a renderer is available.
 *
 * @method ensureTextures
 * @param {WebGLRenderer} renderer
 */
Sky.prototype.ensureTextures = function(renderer)
{
	if (this._texturesGenerating) { return; }
	if (!renderer) { return; }

	// Regenerate if renderer changed (e.g. after tab switch creates new WebGLRenderer)
	if (this._texturesReady && this._lastRenderer === renderer) { return; }

	var self = this;
	this._texturesGenerating = true;
	this._texturesReady = false;

	if (this._texturesGenerator)
	{
		this._texturesGenerator.dispose({textures: true});
	}

	this._lastRenderer = renderer;
	this._texturesGenerator = new PrecomputedTexturesGenerator(renderer);
	this._texturesGenerator.update().then(function(textures)
	{
		self._skyMaterial.irradianceTexture = textures.irradianceTexture;
		self._skyMaterial.scatteringTexture = textures.scatteringTexture;
		self._skyMaterial.transmittanceTexture = textures.transmittanceTexture;

		self.sun.transmittanceTexture = textures.transmittanceTexture;
		self._skyLightProbe.irradianceTexture = textures.irradianceTexture;

		// Share LUT textures with atmosphere pass for clouds
		if (self._atmospherePass)
		{
			self._atmospherePass.setTextures(textures);
		}

		self._texturesReady = true;
		self._texturesGenerating = false;
		self.updateSky();
	}).catch(function(err)
	{
		console.error("Sky: texture generation failed", err);
		self._texturesGenerating = false;
	});
};

/**
 * Update sky state each frame.
 *
 * @method update
 * @param {number} delta Delta time in seconds
 */
Sky.prototype.update = function(delta)
{
	if (!this._texturesReady && !this._texturesGenerating)
	{
		var program = this.getProgram();
		if (program && program.renderer)
		{
			this.ensureTextures(program.renderer);
		}
	}

	if (this.autoUpdate)
	{
		this.time += delta;

		if (this.time > this.dayTime)
		{
			this.time -= this.dayTime;
		}

		this.updateSky();
	}

	// Position sky mesh at active camera so it always fills the background
	var scene = this.getScene();
	if (scene)
	{
		var camera = scene.cameras && scene.cameras.length > 0 ? scene.cameras[0] : scene.defaultCamera;
		if (camera)
		{
			this._skyMesh.position.copy(camera.position);
			this._skyMesh.updateMatrix();
			this._skyMesh.updateMatrixWorld(true);

			// Auto-inject AtmospherePass into camera's composer for clouds rendering
			if (this.cloudsEnabled && camera.composer && !this._atmospherePass)
			{
				try
				{
					this._atmospherePass = new AtmospherePass();
					this._atmospherePass.cloudsEnabled = true;
					this._atmospherePass.coverage = this.coverage;
					this._atmospherePass.cloudLayers = this.cloudLayers;

					// Insert before the last pass (which is typically renderToScreen)
					var passes = camera.composer.passes;
					var lastPass = passes[passes.length - 1];
					if (lastPass)
					{
						lastPass.renderToScreen = false;
					}
					this._atmospherePass.renderToScreen = true;
					camera.composer.addPass(this._atmospherePass);

					// Share textures if already generated
					if (this._texturesReady && this._texturesGenerator)
					{
						this._atmospherePass.setTextures({
							irradianceTexture: this._skyMaterial.irradianceTexture,
							scatteringTexture: this._skyMaterial.scatteringTexture,
							transmittanceTexture: this._skyMaterial.transmittanceTexture
						});
					}
				}
				catch (e)
				{
					console.error("Sky: AtmospherePass injection failed", e);
				}
			}

			// Remove atmosphere pass if clouds disabled
			if (!this.cloudsEnabled && this._atmospherePass && camera.composer)
			{
				camera.composer.removePass(this._atmospherePass);
				// Restore renderToScreen on last pass
				var passes = camera.composer.passes;
				if (passes.length > 0)
				{
					passes[passes.length - 1].renderToScreen = true;
				}
				this._atmospherePass.dispose();
				this._atmospherePass = null;
			}
		}
	}

	Object3D.prototype.update.call(this, delta);
};

/**
 * Update sky sun/moon directions and sync all components.
 *
 * @method updateSky
 */
Sky.prototype.updateSky = function()
{
	// Compute a date offset from the base date using time/dayTime ratio
	var timeRatio = this.time / this.dayTime;
	var offsetMs = timeRatio * 24 * 60 * 60 * 1000;
	var currentDate = new Date(this.date.getTime() + offsetMs);

	// Compute sun and moon directions in ECEF
	getSunDirectionECEF(currentDate, _sunDirection);
	getMoonDirectionECEF(currentDate, _moonDirection);

	// Compute observer ECEF position from longitude/latitude
	var lonRad = this.longitude * Math.PI / 180;
	var latRad = this.latitude * Math.PI / 180;
	var geodetic = new Geodetic(lonRad, latRad, 0);
	geodetic.toECEF(_ecefPosition, {ellipsoid: Ellipsoid.WGS84});

	// Build ENU-to-ECEF rotation+translation matrix
	// Maps local Y-up scene coordinates to ECEF:
	//   local X → East, local Y → Up (radial), local Z → North
	var sinLon = Math.sin(lonRad);
	var cosLon = Math.cos(lonRad);
	var sinLat = Math.sin(latRad);
	var cosLat = Math.cos(latRad);

	// East (ECEF components)
	var ex = -sinLon, ey = cosLon, ez = 0;
	// Up (ECEF components) - radial direction at observer
	var ux = cosLat * cosLon, uy = cosLat * sinLon, uz = sinLat;
	// North (ECEF components)
	var nx = -sinLat * cosLon, ny = -sinLat * sinLon, nz = cosLat;

	// Matrix4.set takes row-major args
	// Column 0 = local X → East, Column 1 = local Y → Up, Column 2 = local Z → North
	_worldToECEF.set(
		ex, ux, nx, _ecefPosition.x,
		ey, uy, ny, _ecefPosition.y,
		ez, uz, nz, _ecefPosition.z,
		0, 0, 0, 1
	);

	// Update sky material
	this._skyMaterial.uniforms.sunDirection.value.copy(_sunDirection);
	this._skyMaterial.moonDirection.copy(_moonDirection);
	this._skyMaterial.uniforms.worldToECEFMatrix.value.copy(_worldToECEF);
	this._skyMaterial.uniforms.toneMappingExposure.value = this.intensity;

	// Update sun light
	this.sun.sunDirection.copy(_sunDirection);
	this.sun.worldToECEFMatrix.copy(_worldToECEF);
	this.sun.intensity = this.intensity;
	this.sun.update();

	// Update sky light probe
	this._skyLightProbe.sunDirection.copy(_sunDirection);
	this._skyLightProbe.worldToECEFMatrix.copy(_worldToECEF);
	this._skyLightProbe.update();
};

/**
 * Get the parent program of this object.
 *
 * @method getProgram
 * @return {Program|null}
 */
Sky.prototype.getProgram = function()
{
	var node = this;
	while (node.parent)
	{
		node = node.parent;
		if (node.type === "Program") { return node; }
	}
	return null;
};

/**
 * Get the parent scene of this object.
 *
 * @method getScene
 * @return {Scene|null}
 */
Sky.prototype.getScene = function()
{
	var node = this;
	while (node.parent)
	{
		node = node.parent;
		if (node.isScene || node.cameras) { return node; }
	}
	return null;
};

/**
 * Dispose sky resources.
 *
 * @method dispose
 */
Sky.prototype.dispose = function()
{
	if (this._texturesGenerator)
	{
		this._texturesGenerator.dispose({textures: true});
		this._texturesGenerator = null;
	}

	if (this._skyMaterial)
	{
		this._skyMaterial.dispose();
	}

	if (this._skyMesh && this._skyMesh.geometry)
	{
		this._skyMesh.geometry.dispose();
	}

	if (this._atmospherePass)
	{
		this._atmospherePass.dispose();
		this._atmospherePass = null;
	}

	this._texturesReady = false;
};

Sky.prototype.toJSON = function(meta)
{
	var data = Object3D.prototype.toJSON.call(this, meta);

	data.object.autoUpdate = this.autoUpdate;
	data.object.dayTime = this.dayTime;
	data.object.time = this.time;
	data.object.date = this.date.toISOString();
	data.object.longitude = this.longitude;
	data.object.latitude = this.latitude;
	data.object.intensity = this.intensity;

	data.object.sun = {};
	data.object.sun.castShadow = this.sun.castShadow;
	data.object.sun.shadow = this.sun.shadow.toJSON();

	data.object.cloudsEnabled = this.cloudsEnabled;
	data.object.coverage = this.coverage;
	data.object.cloudLayers = this.cloudLayers;

	return data;
};

export {Sky};
