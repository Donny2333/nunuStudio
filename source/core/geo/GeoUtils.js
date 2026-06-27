import {Ellipsoid, Geodetic, TilingScheme, TileCoordinate} from "@takram/three-geospatial";
import {Vector3} from "three";

var GeoUtils = {};

GeoUtils.ellipsoid = Ellipsoid.WGS84;
GeoUtils.tilingScheme = new TilingScheme();

GeoUtils.lngLatToTile = function(lng, lat, zoom)
{
	var geodetic = new Geodetic(lng * Math.PI / 180, lat * Math.PI / 180, 0);
	return GeoUtils.tilingScheme.getTile(geodetic, zoom);
};

GeoUtils.lngLatToWebMercatorTile = function(lng, lat, zoom)
{
	var n = Math.pow(2, zoom);
	var x = Math.floor((lng + 180) / 360 * n);
	var latRad = lat * Math.PI / 180;
	var y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
	return {x: x, y: y};
};

GeoUtils.lngLatToECEF = function(lng, lat, alt, result)
{
	var geodetic = new Geodetic(lng * Math.PI / 180, lat * Math.PI / 180, alt || 0);
	return geodetic.toECEF(result || new Vector3());
};

GeoUtils.ecefToLngLat = function(position)
{
	var geodetic = new Geodetic();
	geodetic.setFromECEF(position);
	return {
		lng: geodetic.longitude * 180 / Math.PI,
		lat: geodetic.latitude * 180 / Math.PI,
		alt: geodetic.height
	};
};

GeoUtils.tileToLngLat = function(x, y, z)
{
	var rect = GeoUtils.tilingScheme.getRectangle(new TileCoordinate(x, y, z));
	var centerLng = (rect.west + rect.east) / 2 * 180 / Math.PI;
	var centerLat = (rect.south + rect.north) / 2 * 180 / Math.PI;
	return {lng: centerLng, lat: centerLat};
};

export {GeoUtils};
