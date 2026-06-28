import "./three/animation/AnimationClip.js";
import "./three/animation/KeyframeTrack.js";
import "./three/cameras/Camera.js";
import "./three/core/BufferAttribute.js";
import "./three/core/InstancedBufferAttribute.js";
import "./three/core/InterleavedBuffer.js";
import "./three/core/InterleavedBufferAttribute.js";
import "./three/core/Object3D.js";
import "./three/lights/LightShadow.js";
import "./three/loaders/BufferGeometryLoader.js";
import "./three/materials/Material.js";
import "./three/objects/Points.js";
import "./three/objects/Skeleton.js";
import "./three/scenes/Fog.js";
import "./three/textures/Texture.js";

/**
 * iStudio core main file.
 *
 * Store development version, timestamp and contains global method to check browser feature support.
 *
 * @class IStudio
 * @module Runtime
 */
function IStudio() {}

/**
 * Aplication name (might be usefull if getting the module as a unnamed export)
 *
 * @attribute NAME
 * @type {string}
 * @default "iStudio"
 */
IStudio.NAME = "iStudio";

/**
 * Stores the runtime version.
 *
 * @attribute VERSION
 * @type {string}
 */

/**
 * Stores the timestamp of the application build.
 *
 * @attribute TIMESTAMP
 * @type {string}
 */

/**
 * Repository branch, used to track the version after publishing.
 *
 * @static
 * @attribute REPOSITORY_BRANCH
 * @type {string}
 */

/**
 * Repository commit uuid, used to track the version after publishing.
 *
 * @static
 * @attribute REPOSITORY_COMMIT
 * @type {string}
 */

/**
 * Indicates if the application/library is being used in development mode.
 *
 * Can be usefull to restrict development functionality when building to production.
 *
 * @static
 * @attribute DEVELOPMENT
 * @type {boolean}
 */

/**
 * NWJS platform, used for desktop version.
 *
 * @static
 * @attribute NWJS
 * @type {number}
 */
IStudio.NWJS = 200;

/**
 * Running inside of a regular web browser.
 *
 * @static
 * @attribute BROWSER
 * @type {number}
 */
IStudio.BROWSER = 201;

/**
 * Cordova platform, used for mobile versions.
 *
 * @static
 * @attribute CORDOVA
 * @type {number}
 */
IStudio.CORDOVA = 202;

/**
 * Import stuff from a namespace to another target namespace.
 *
 * If not target is specified window is used.
 *
 * @static
 * @method copyNamespace
 */
IStudio.copyNamespace = function(namespace, target)
{
	if (target === undefined)
	{
		target = window;
	}

	for (var i in namespace)
	{
		if (!(i in target))
		{
			target[i] = namespace[i];
		}
	}
};

/**
 * Get the query parameter from the browser URL.
 *
 * @method getQueryParameters
 * @return {Object} Object with parameters read from the URL.
 */
IStudio.getQueryParameters = function()
{
	var values = location.search.substring(1).split("&");
	var parameters = {};
	for (var i = 0; i < values.length; i++)
	{
		var pair = values[i].split("=");
		if (pair.length > 1)
		{
			var name = unescape(pair[0]).replace(new RegExp("\"", "g"), "");
			var value = unescape(pair[1]).replace(new RegExp("\"", "g"), "");
			parameters[name] = value;
		}
	}

	return parameters;
};


/**
 * Create a web worker from code written in a string.
 *
 * Uses a blob to inject the code and loads it from and URL object.
 *
 * @method createWorker
 * @param {string} code Javascript code for this worker.
 * @param {Function} onMessage On message worker callback.
 * @return {Worker} Returns a worker instance (for comunication).
 */
IStudio.createWorker = function(code, onMessage)
{
	var blob = new Blob([code], {type: "application/javascript"});
	var worker = new Worker(URL.createObjectURL(blob));

	if (onMessage !== undefined)
	{
		worker.onmessage = onMessage;
	}

	return worker;
};

/**
 * Check if host supports WebAudio.
 *
 * @method webAudioAvailable
 * @return {boolean} True if WebAudio is available.
 */
IStudio.webAudioAvailable = function()
{
	return window.AudioContext !== undefined || window.webkitAudioContext !== undefined;
};

/**
 * Check if host supports WebGL, only checks for WebGL 1.0 support.
 *
 * @method webglAvailable
 * @return {boolean} True if WebGL is available.
 */
IStudio.webGLAvailable = function()
{
	try
	{
		var canvas = document.createElement("canvas");
		var context = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
		var extensions = context.getSupportedExtensions();

		return true;
	}
	catch (e) {}

	return false;
};

/**
 * Check in wich platform the enviroment is running.
 *
 * Possible return values are:
 * - IStudio.NWJS
 * - IStudio.BROWSER
 * - IStudio.CORDOVA
 *
 * @method getPlatform
 * @return {number} Indicates the platform type.
 */
IStudio.getPlatform = function()
{
	if (window.nw !== undefined)
	{
		return IStudio.NWJS;
	}
	else if (window.cordova !== undefined)
	{
		return IStudio.CORDOVA;
	}

	return IStudio.BROWSER;
};

/**
 * Check if app is running inside NWJS.
 *
 * @method runningOnDesktop
 * @return {boolean} True if running inside NWJS
 */
IStudio.runningOnDesktop = function()
{
	return window.nw !== undefined;
};

/**
 * Open a webpage on a new window.
 *
 * On desktop and mobile it will open the default browser.
 *
 * On the web it will open as a popup.
 *
 * @method openWebpage
 */
IStudio.openWebpage = function(url)
{
	if (IStudio.runningOnDesktop())
	{
		window.require("nw.gui").Shell.openExternal(url);
	}
	else
	{
		window.open(url);
	}
};

/**
 * Check if there is some element on fullscreen mode.
 *
 * Returns true even the fullscreen element is not related with the app.
 *
 * @method isFullscreen
 * @return {boolean} True if there is some element in fullscreen mode.
 */
IStudio.isFullscreen = function()
{
	return document.webkitIsFullScreen === true || document.mozFullScreen === true || document.webkitIsFullScreen === true || document.webkitIsFullScreen === true || document.fullscreen === true || false;
};

/**
 * Set an element into fullscreen mode or exit out of fullscreen mode.
 *
 * Uses isFullscreen to check if the application is running in fullscreen mode already.
 *
 * @method setFullscreen
 * @param {boolean} fullscreen If true the application will enter fullscreen mode, if false it will exit, if undefine it will toggle the value.
 * @param {Component} element DOM element to put into fullscreen.
 */
IStudio.setFullscreen = function(fullscreen, element)
{
	var isFullscreen = IStudio.isFullscreen();

	if (fullscreen === undefined)
	{
		fullscreen = !isFullscreen;
	}

	if (fullscreen === true)
	{
		if (element === undefined)
		{
			element = document.body;
		}

		if (isFullscreen === false)
		{
			element.requestFullscreen = element.requestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen || element.msRequestFullscreen;

			if (element.requestFullscreen !== undefined)
			{
				element.requestFullscreen();
			}
		}
	}
	else
	{
		if (isFullscreen === true)
		{
			document.exitFullscreen = document.exitFullscreen || document.mozCancelFullScreen || document.webkitExitFullscreen;

			if (document.exitFullscreen !== undefined)
			{
				document.exitFullscreen();
			}
		}
	}
};

export {IStudio};
