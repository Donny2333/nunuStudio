import {BufferGeometry, DefaultLoadingManager} from "three";

/**
 * Legacy geometry loader is a stub for the old geometry file format.
 *
 * Old .nsp/.isp projects using legacy Geometry format are not supported after the Three.js r167 upgrade.
 *
 * @class LegacyGeometryLoader
 */
function LegacyGeometryLoader(manager)
{
	this.manager = manager !== undefined ? manager : DefaultLoadingManager;
	this.withCredentials = false;
}

LegacyGeometryLoader.prototype.load = function(url, onLoad, onProgress, onError)
{
	console.warn("iStudio: LegacyGeometryLoader is no longer supported. Legacy geometry format cannot be loaded.");
	if (onLoad)
	{
		onLoad(new BufferGeometry(), []);
	}
};

LegacyGeometryLoader.prototype.setPath = function(value)
{
	this.path = value;
	return this;
};

LegacyGeometryLoader.prototype.setResourcePath = function(value)
{
	this.resourcePath = value;
	return this;
};

LegacyGeometryLoader.prototype.setCrossOrigin = function(value)
{
	this.crossOrigin = value;
	return this;
};

LegacyGeometryLoader.prototype.parse = function(json, path)
{
	console.warn("iStudio: LegacyGeometryLoader.parse is no longer supported.");
	return {geometry: new BufferGeometry(), materials: []};
};

export {LegacyGeometryLoader};
