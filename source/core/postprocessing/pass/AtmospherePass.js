import {HalfFloatType, Vector2, Vector3, Matrix4} from "three";
import {EffectComposer as PPEffectComposer, EffectPass as PPEffectPass, RenderPass as PPRenderPass} from "postprocessing";
import {AerialPerspectiveEffect} from "@takram/three-atmosphere";
import {CloudsEffect, LocalWeather, CloudShape, CloudShapeDetail, Turbulence} from "@takram/three-clouds";
import {STBNLoader, DEFAULT_STBN_URL} from "@takram/three-geospatial";
import {Pass} from "../Pass.js";

/**
 * Atmosphere post-processing pass that applies aerial perspective scattering
 * and optionally renders volumetric clouds.
 *
 * @class AtmospherePass
 * @extends {Pass}
 * @module Postprocessing
 */
function AtmospherePass()
{
	Pass.call(this);

	this.type = "Atmosphere";
	this.needsSwap = true;

	this.transmittance = true;
	this.inscatter = true;
	this.sunDirection = new Vector3(0, 1, 0);
	this.worldToECEFMatrix = new Matrix4();

	this.cloudsEnabled = false;
	this.coverage = 0.5;
	this.cloudLayers = null;

	this._effect = null;
	this._cloudsEffect = null;
	this._ppComposer = null;
	this._renderPass = null;
	this._initialized = false;
	this._stbnReady = false;
	this._texturesReady = false;
	this._lastWidth = 0;
	this._lastHeight = 0;
}

AtmospherePass.prototype = Object.create(Pass.prototype);

AtmospherePass.prototype.setSize = function(width, height)
{
	if (this._ppComposer)
	{
		this._ppComposer.setSize(width, height);
	}
};

AtmospherePass.prototype.render = function(renderer, writeBuffer, readBuffer, delta, maskActive, scene, camera)
{
	if (!this.enabled) { return; }

	if (!this._initialized && camera && renderer && scene)
	{
		this._initEffect(renderer, scene, camera);
	}

	if (!this._ppComposer) { return; }

	// Update scene and camera on internal render pass each frame
	this._renderPass.mainScene = scene;
	this._renderPass.mainCamera = camera;

	// Sync from Sky object in scene
	if (scene)
	{
		this._syncFromScene(scene);
	}

	// Sync aerial perspective effect
	this._effect.sunDirection.copy(this.sunDirection);
	this._effect.worldToECEFMatrix.copy(this.worldToECEFMatrix);
	this._effect.transmittance = this.transmittance;
	this._effect.inscatter = this.inscatter;
	this._effect.mainCamera = camera;

	// Sync clouds
	if (this._cloudsEffect)
	{
		if (this.cloudsEnabled)
		{
			this._cloudsEffect.sunDirection.copy(this.sunDirection);
			this._cloudsEffect.worldToECEFMatrix.copy(this.worldToECEFMatrix);
			this._cloudsEffect.mainCamera = camera;
			this._cloudsEffect.coverage = this.coverage;

			if (this.cloudLayers)
			{
				for (var i = 0; i < 4; i++)
				{
					var cfg = this.cloudLayers[i];
					var layer = this._cloudsEffect.cloudLayers[i];
					if (cfg && layer)
					{
						layer.altitude = cfg.altitude;
						layer.height = cfg.height;
						layer.densityScale = cfg.densityScale;
						layer.shadow = cfg.shadow;
					}
				}
			}
		}

		this._cloudsEffectPass.enabled = this.cloudsEnabled && this._stbnReady;
		this._atmosphereEffectPass.enabled = this._texturesReady;
	}

	// Update effect pass cameras
	this._atmosphereEffectPass.mainCamera = camera;
	if (this._cloudsEffectPass)
	{
		this._cloudsEffectPass.mainCamera = camera;
	}

	// Render internal postprocessing pipeline
	var size = renderer.getSize(new Vector2());
	if (size.x !== this._lastWidth || size.y !== this._lastHeight)
	{
		this._ppComposer.setSize(size.x, size.y);
		this._lastWidth = size.x;
		this._lastHeight = size.y;
	}

	// Ensure renderToScreen is set on the last enabled pass
	var passes = this._ppComposer.passes;
	for (var i = 0; i < passes.length; i++)
	{
		passes[i].renderToScreen = false;
	}
	for (var i = passes.length - 1; i >= 0; i--)
	{
		if (passes[i].enabled)
		{
			passes[i].renderToScreen = true;
			break;
		}
	}

	this._ppComposer.render(delta);
};

AtmospherePass.prototype._syncFromScene = function(scene)
{
	var self = this;
	scene.traverse(function(child)
	{
		if (child.type === "Sky")
		{
			self.sunDirection.copy(child._skyMaterial.uniforms.sunDirection.value);
			self.worldToECEFMatrix.copy(child._skyMaterial.uniforms.worldToECEFMatrix.value);
			self.cloudsEnabled = child.cloudsEnabled;
			self.coverage = child.coverage;
			self.cloudLayers = child.cloudLayers;
		}
	});
};

AtmospherePass.prototype._initEffect = function(renderer, scene, camera)
{
	var self = this;

	// Aerial perspective effect
	this._effect = new AerialPerspectiveEffect(camera, {
		transmittance: this.transmittance,
		inscatter: this.inscatter,
		correctAltitude: false,
		sky: false
	});

	// Clouds effect
	this._cloudsEffect = new CloudsEffect(camera, {resolutionScale: 0.5});
	this._cloudsEffect.skipRendering = false;
	this._cloudsEffect.correctAltitude = false;
	this._cloudsEffect.coverage = this.coverage;
	this._cloudsEffect.qualityPreset = "medium";
	this._cloudsEffect.localWeatherTexture = new LocalWeather();
	this._cloudsEffect.shapeTexture = new CloudShape();
	this._cloudsEffect.shapeDetailTexture = new CloudShapeDetail();
	this._cloudsEffect.turbulenceTexture = new Turbulence();

	// Load STBN (Spatio-Temporal Blue Noise) texture required for ray marching
	var stbnLoader = new STBNLoader();
	stbnLoader.load(DEFAULT_STBN_URL, function(texture)
	{
		if (self._cloudsEffect)
		{
			self._cloudsEffect.stbnTexture = texture;
			self._stbnReady = true;
		}
	});

	// Route clouds output to aerial perspective via events
	this._cloudsEffect.events.addEventListener("change", function(event)
	{
		if (event.property === "atmosphereOverlay")
		{
			self._effect.overlay = self._cloudsEffect.atmosphereOverlay;
		}
		else if (event.property === "atmosphereShadow")
		{
			self._effect.shadow = self._cloudsEffect.atmosphereShadow;
		}
		else if (event.property === "atmosphereShadowLength")
		{
			self._effect.shadowLength = self._cloudsEffect.atmosphereShadowLength;
		}
	});

	// Build internal postprocessing pipeline
	this._ppComposer = new PPEffectComposer(renderer, {frameBufferType: HalfFloatType});
	this._ppComposer.autoRenderToScreen = false;

	this._renderPass = new PPRenderPass(scene, camera);
	this._ppComposer.addPass(this._renderPass);

	this._cloudsEffectPass = new PPEffectPass(camera, this._cloudsEffect);
	this._cloudsEffectPass.enabled = this.cloudsEnabled && this._stbnReady;
	this._ppComposer.addPass(this._cloudsEffectPass);

	this._atmosphereEffectPass = new PPEffectPass(camera, this._effect);
	this._atmosphereEffectPass.enabled = this._texturesReady;
	this._ppComposer.addPass(this._atmosphereEffectPass);

	this._initialized = true;
};

AtmospherePass.prototype.setTextures = function(textures)
{
	if (!this._effect) { return; }

	this._effect.irradianceTexture = textures.irradianceTexture;
	this._effect.scatteringTexture = textures.scatteringTexture;
	this._effect.transmittanceTexture = textures.transmittanceTexture;

	if (this._cloudsEffect)
	{
		this._cloudsEffect.irradianceTexture = textures.irradianceTexture;
		this._cloudsEffect.scatteringTexture = textures.scatteringTexture;
		this._cloudsEffect.transmittanceTexture = textures.transmittanceTexture;
	}

	this._texturesReady = true;
};

AtmospherePass.prototype.dispose = function()
{
	if (this._ppComposer)
	{
		this._ppComposer.dispose();
		this._ppComposer = null;
	}
	this._cloudsEffect = null;
	this._effect = null;
	this._initialized = false;
	this._stbnReady = false;
	this._texturesReady = false;
};

AtmospherePass.prototype.toJSON = function()
{
	var data = Pass.prototype.toJSON.call(this);

	data.transmittance = this.transmittance;
	data.inscatter = this.inscatter;
	data.cloudsEnabled = this.cloudsEnabled;
	data.coverage = this.coverage;
	data.cloudLayers = this.cloudLayers;

	return data;
};

export {AtmospherePass};
