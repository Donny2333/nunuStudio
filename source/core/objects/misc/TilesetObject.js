import {Object3D, Vector3} from "three";
import {TilesRenderer} from "3d-tiles-renderer";
import {GeneratedSurfacePlugin, XYZTilesOverlay, UpdateOnChangePlugin} from "3d-tiles-renderer/plugins";

var SATELLITE_URL = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
var HYBRID_URL = "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";

/**
 * Loads an image via <img> element (bypasses CORS fetch restriction),
 * draws it to an offscreen canvas, and returns a Response-like object
 * with .arrayBuffer() for compatibility with 3d-tiles-renderer's fetchData pipeline.
 */
function imgFetch(url, options)
{
	return new Promise(function(resolve, reject)
	{
		if (options && options.signal && options.signal.aborted)
		{
			reject(new DOMException("Aborted", "AbortError"));
			return;
		}

		var img = new Image();
		img.crossOrigin = "anonymous";

		var abortHandler = null;
		if (options && options.signal)
		{
			abortHandler = function()
			{
				img.src = "";
				reject(new DOMException("Aborted", "AbortError"));
			};
			options.signal.addEventListener("abort", abortHandler);
		}

		img.onload = function()
		{
			if (options && options.signal)
			{
				options.signal.removeEventListener("abort", abortHandler);
			}

			var canvas = document.createElement("canvas");
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;
			var ctx = canvas.getContext("2d");
			ctx.drawImage(img, 0, 0);

			canvas.toBlob(function(blob)
			{
				if (!blob)
				{
					reject(new Error("Failed to create blob from image"));
					return;
				}
				resolve({
					ok: true,
					status: 200,
					arrayBuffer: function() { return blob.arrayBuffer(); }
				});
			}, "image/png");
		};

		img.onerror = function()
		{
			if (options && options.signal)
			{
				options.signal.removeEventListener("abort", abortHandler);
			}
			reject(new TypeError("Failed to load image: " + url));
		};

		img.src = url;
	});
}

function TilesetObject(url)
{
	var instance = Reflect.construct(Object3D, [], new.target || TilesetObject);

	instance.type = "TilesetObject";
	instance.name = "tileset";

	instance.url = url || SATELLITE_URL;
	instance.centerLat = 39.9;
	instance.centerLon = 116.4;
	instance.zoom = 19;
	instance.minZoom = 1;
	instance.maxZoom = 19;
	instance.errorTarget = 1;

	/**
	 * Whether label overlay is enabled on the map tiles.
	 *
	 * @property labelsEnabled
	 * @type {boolean}
	 * @default true
	 */
	instance.labelsEnabled = false;

	instance._tiles = null;

	instance._initTiles();

	return instance;
}

TilesetObject.prototype = Object.create(Object3D.prototype);
TilesetObject.prototype.constructor = TilesetObject;

TilesetObject.prototype._getEffectiveUrl = function()
{
	if (this.url !== SATELLITE_URL && this.url !== HYBRID_URL)
	{
		return this.url;
	}
	return this.labelsEnabled ? HYBRID_URL : SATELLITE_URL;
};

TilesetObject.prototype._initTiles = function()
{
	var self = this;

	var overlay = new XYZTilesOverlay({
		url: this._getEffectiveUrl(),
		levels: 20,
		tileDimension: 256
	});

	// Override fetch to use <img> element (bypasses CORS)
	overlay.fetch = function(fetchUrl)
	{
		return imgFetch(fetchUrl);
	};

	var surface = new GeneratedSurfacePlugin({
		overlay: overlay,
		shape: "planar",
		center: true,
		applyOverlayTexture: true,
		useRecommendedSettings: true
	});

	var tiles = new TilesRenderer();
	tiles.registerPlugin(new UpdateOnChangePlugin());
	tiles.registerPlugin(overlay);
	tiles.registerPlugin(surface);

	tiles.errorTarget = this.errorTarget;

	// Planar mode uses z-up, rotate to y-up for three.js scene
	// Scale up: planar mode produces ~2x1 unit surface, we need ~1000 units for world scale
	tiles.group.rotation.x = -Math.PI / 2;
	tiles.group.scale.setScalar(500);
	tiles.group.frustumCulled = false;

	tiles.group.raycast = function() { return false; };
	tiles.group.hideInEditor = true;
	this.add(tiles.group);
	this._tiles = tiles;
	this._surface = surface;

	// Position immediately so first tiles.update() sees correct camera-relative position
	this._updatePosition();
};

TilesetObject.prototype._updatePosition = function()
{
	// Convert centerLat/centerLon to planar normalized position
	var lonNorm = this.centerLon / 360.0 + 0.5;
	var latRad = this.centerLat * Math.PI / 180.0;
	var mercY = Math.log(Math.tan(Math.PI / 4.0 + latRad / 2.0));
	var latNorm = mercY / (2.0 * Math.PI) + 0.5;

	// With center=true: planar x = (lonNorm - 0.5), y = latNorm - 0.5
	var posX = lonNorm - 0.5;
	var posY = latNorm - 0.5;

	// After group rotation.x=-PI/2 and scale 500:
	// Beijing world pos = (posX * 500, 0, -posY * 500)
	// Set group position to move Beijing to parent origin
	var scale = 500;
	this._tiles.group.position.set(-posX * scale, 0, posY * scale);
};

TilesetObject.prototype.setLabelsEnabled = function(enabled)
{
	this.labelsEnabled = enabled;
	this.loadTiles();
};

TilesetObject.prototype.updateFromCamera = function(camera, renderer)
{
	if (!this._tiles) { return; }

	this._tiles.errorTarget = this.errorTarget;

	// Ensure world matrices are current (ancestors + descendants) before tile selection
	this.updateWorldMatrix(true, true);
	camera.updateWorldMatrix(true, false);

	this._tiles.setCamera(camera);
	if (renderer)
	{
		this._tiles.setResolutionFromRenderer(camera, renderer);
	}
	this._tiles.update();
};

TilesetObject.prototype.loadTiles = function()
{
	if (this._tiles)
	{
		this.remove(this._tiles.group);
		this._tiles.dispose();
		this._tiles = null;
	}
	this._initTiles();
};

TilesetObject.prototype.isEmpty = function()
{
	for (var i = 0; i < this.children.length; i++)
	{
		if (!this.children[i].hideInEditor)
		{
			return false;
		}
	}
	return true;
};

TilesetObject.prototype.initialize = function()
{
	if (this._tiles)
	{
		this.remove(this._tiles.group);
		this._tiles.dispose();
		this._tiles = null;
	}
	this._initTiles();

	for (var i = 0; i < this.children.length; i++)
	{
		if (this.children[i].initialize !== undefined)
		{
			this.children[i].initialize();
		}
	}
};

TilesetObject.prototype.update = function(delta)
{
	var scene = this.getScene();
	if (!scene) { return; }

	var cam = null;
	if (scene.cameras && scene.cameras.length > 0)
	{
		cam = scene.cameras[0];
	}
	else if (scene.defaultCamera)
	{
		cam = scene.defaultCamera;
	}

	if (cam)
	{
		var renderer = scene.program ? scene.program.renderer : null;
		this.updateFromCamera(cam, renderer);
	}
};

TilesetObject.prototype.getScene = function()
{
	var node = this;
	while (node.parent)
	{
		node = node.parent;
		if (node.isScene || node.cameras) { return node; }
	}
	return null;
};

TilesetObject.prototype.resize = function(x, y) {};

TilesetObject.prototype.dispose = function()
{
	if (this._tiles)
	{
		this._tiles.dispose();
		this._tiles = null;
	}
};

TilesetObject.prototype.toJSON = function(meta)
{
	var data = Object3D.prototype.toJSON.call(this, meta);

	data.object.url = this.url;
	data.object.centerLat = this.centerLat;
	data.object.centerLon = this.centerLon;
	data.object.zoom = this.zoom;
	data.object.errorTarget = this.errorTarget;
	data.object.labelsEnabled = this.labelsEnabled;

	return data;
};

export {TilesetObject};
