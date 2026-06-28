import {World, NaiveBroadphase, SplitSolver, GSSolver} from "cannon-es";
import {Color, Texture, Camera, Raycaster, Vector2, Scene as TScene, Object3D, Fog, FogExp2, Vector3, Quaternion} from "three";
import {PointOctree} from "sparse-octree";
import {Program} from "./Program.js";

/**
 * Scenes allow you to set up what and where is to be rendered by the engine.
 *
 * This is where you place objects, lights and cameras.
 *
 * A program may contain multiple scenes, its possible to change between scene using scripts.
 *
 * Scene three.js documentation available here https://threejs.org/docs/index.html#Reference/Scenes/Scene.
 *
 * @class Scene
 * @module Core
 * @extends {Scene}
 */
function Scene()
{
	var instance = Reflect.construct(TScene, [], new.target || Scene);

	instance.name = "scene";
	instance.matrixAutoUpdate = false;
	instance.usePhysics = true;

	instance.world = new World();
	instance.world.defaultContactMaterial.contactEquationStiffness = 1e9;
	instance.world.defaultContactMaterial.contactEquationRelaxation = 4;
	instance.world.quatNormalizeSkip = 0;
	instance.world.quatNormalizeFast = false;
	instance.world.gravity.set(0, -9.8, 0);
	instance.world.broadphase = new NaiveBroadphase();
	instance.world.solver = new SplitSolver(new GSSolver());
	instance.world.solver.tolerance = 0.05;
	instance.world.solver.iterations = 7;

	instance.background = null;
	instance.alpha = 1.0;
	instance.cameras = [];
	instance.defaultCamera = null;
	instance.delta = 0;
	instance.raycaster = new Raycaster();
	instance.useOctree = false;
	instance.octree = null;
	instance.octreeUpdateScheduled = false;
	instance.octreeMatches = [];
	instance.program = null;
	instance.canvas = null;
	instance.mouse = new Vector2(0, 0);

	return instance;
}

Scene.prototype = Object.create(TScene.prototype);
Scene.prototype.constructor = Scene;

Scene.prototype.initialize = function()
{
	this.program = this.parent;
	this.canvas = this.parent.canvas;

	Object3D.prototype.initialize.call(this);

	for (var i = 0; i < this.children.length; i++)
	{
		this.children[i].traverse(function(children)
		{
			children.initialize();
		});
	}
};

/**
 * Update scene objects and the physics world.
 *
 * Also updates the global ray caster object used for object culling.
 *
 * @method update
 * @param {number} delta The time since the last frame.
 */
Scene.prototype.update = function(delta)
{
	this.mouse.set(this.program.mouse.position.x / this.canvas.width * 2 - 1, -2 * this.program.mouse.position.y / this.canvas.height + 1);

	if (this.cameras.length > 0)
	{
		this.raycaster.setFromCamera(this.mouse, this.cameras[0]);
	}
	else if (this.defaultCamera !== null)
	{
		this.raycaster.setFromCamera(this.mouse, this.defaultCamera);
	}

	if (this.usePhysics)
	{
		this.world.step(delta < 0.05 ? delta : 0.05);
	}

	for (var i = 0; i < this.children.length; i++)
	{
		this.children[i].traverse(function(children)
		{
			children.update(delta);
		});
	}
};

Scene.prototype.resize = function(x, y)
{
	if (this.defaultCamera !== null)
	{
		this.defaultCamera.resize(x, y);
	}

	for (var i = 0; i < this.cameras.length; i++)
	{
		this.cameras[i].resize(x, y);
	}

	for (var i = 0; i < this.children.length; i++)
	{
		this.children[i].traverse(function(children)
		{
			children.resize(x, y);
		});
	}
};

Scene.prototype.dispose = function()
{
	for (var i = 0; i < this.children.length; i++)
	{
		this.children[i].traverse(function(children)
		{
			children.dispose();
		});
	}
};

/**
 * Render scene using all active cameras.
 *
 * @method render
 * @param {Renderer} renderer
 */
Scene.prototype.render = function(renderer)
{
	renderer.setClearColor(this.background, this.alpha);

	if (this.cameras.length > 0)
	{
		if (this.program.xrEnabled)
		{
			if (this.program.xrMode === Program.XR_VR)
			{
				for (var i = 0; i < this.cameras.length; i++)
				{
					this.cameras[i].render(renderer, this);
				}
			}
			else if (this.program.xrMode === Program.XR_AR)
			{
				renderer.setClearColor(null);
				for (var i = 0; i < this.cameras.length; i++)
				{
					renderer.render(this, this.cameras[i]);
				}
			}
		}
		else
		{
			renderer.setScissorTest(true);

			for (var i = 0; i < this.cameras.length; i++)
			{
				this.cameras[i].setupRenderer(renderer);
				this.cameras[i].render(renderer, this);
			}

			renderer.setScissorTest(false);
		}

	}
	else if (this.defaultCamera !== null)
	{
		if (this.program.xrMode === Program.XR_AR)
		{
			renderer.setClearColor(null);
			renderer.render(this, this.defaultCamera);
		}
		else
		{
			this.defaultCamera.render(renderer, this);
		}
	}
};

/**
 * Get camera from scene using cameras uuid.
 *
 * @method getCamera
 * @param {string} uuid UUID of the camera
 * @param {Object3D} object Object to search cameras in.
 * @return {Camera} Camera if found, else null
 */
Scene.prototype.getCamera = function(uuid, object)
{
	if (object === undefined)
	{
		object = this;
	}

	if (uuid === object.uuid)
	{
		return object;
	}

	var children = object.children;
	for (var i = 0; i < children.length; i++)
	{
		var camera = this.getCamera(uuid, children[i]);
		if (camera !== null)
		{
			return camera;
		}
	}

	return null;
};

/**
 * Add camera to active cameras list.
 *
 * @method addCamera
 * @param {Camera} camera
 */
Scene.prototype.addCamera = function(camera)
{
	if (this.cameras.indexOf(camera) === -1)
	{
		this.cameras.push(camera);
		this.updateCameraOrder();
	}
};

/**
 * Update active camera lister order.
 *
 * This method should be called after changing order value for an active camera.
 *
 *
 * @method updateCameraOrder
 */
Scene.prototype.updateCameraOrder = function()
{
	this.cameras.sort(function(a, b)
	{
		return a.order > b.order;
	});
};

/**
 * Remove camera from active camera list.
 *
 * @param {Camera} camera Camera to be removed
 * @method removeCamera
 */
Scene.prototype.removeCamera = function(camera)
{
	var index = this.cameras.indexOf(camera);
	if (index > -1)
	{
		this.cameras.splice(index, 1);
	}
};

/**
 * Check is camera is active.
 *
 * @param {Camera} camera Camera to be removed
 * @method isCameraActive
 */
Scene.prototype.isCameraActive = function(camera)
{
	return this.cameras.indexOf(camera) > -1;
};


/**
 * Set scene fog mode.
 *
 * It recreates the fog object attached to the scene and set the same color.
 *
 * @method setFogMode
 * @param {number} mode
 */
Scene.prototype.setFogMode = function(mode)
{
	var color = this.fog !== null ? this.fog.color.getHex() : "#FFFFFF";

	if (mode === Fog.LINEAR)
	{
		this.fog = new Fog(color, 5, 20);
	}
	else if (mode === Fog.EXPONENTIAL)
	{
		this.fog = new FogExp2(color, 0.01);
	}
	else if (mode === Fog.NONE)
	{
		this.fog = null;
	}
};

Scene.prototype.toJSON = function(meta)
{
	if (!this.parent || this.parent.type !== "Program")
	{
		console.warn("iStudio: Scene is not on top level serializing as Group.");

		this.type = "Group";
		return Object3D.prototype.toJSON.call(this, meta);
	}

	var self = this;

	var data = Object3D.prototype.toJSON.call(this, meta, function(meta, object)
	{
		// Background
		if (self.background instanceof Color)
		{
			object.background = self.background.toJSON(meta);
		}
		else if (self.background instanceof Texture)
		{
			object.background = self.background.toJSON(meta).uuid;
		}

		// Environment
		if (self.environment instanceof Texture)
		{
			object.environment = self.environment.toJSON(meta).uuid;
		}
	});

	if (this.defaultCamera !== null)
	{
		var position = new Vector3();
		var quaternion = new Quaternion();
		var scale = new Vector3();

		this.defaultCamera.matrixWorld.decompose(position, quaternion, scale);

		var defaultCamera = this.defaultCamera.toJSON(meta);
		defaultCamera.object.position = position.toArray();
		defaultCamera.object.quaternion = quaternion.toArray();
		defaultCamera.object.scale = scale.toArray();
		data.object.defaultCamera = defaultCamera;
	}

	if (this.fog !== null)
	{
		data.object.fog = this.fog.toJSON();
	}

	data.object.usePhysics = this.usePhysics;

	data.object.cameras = [];
	for (var i = 0; i < this.cameras.length; i++)
	{
		data.object.cameras.push(this.cameras[i].uuid);
	}

	data.object.world = {};
	data.object.world.gravity = this.world.gravity;
	data.object.world.quatNormalizeSkip = this.world.quatNormalizeSkip;
	data.object.world.quatNormalizeFast = this.world.quatNormalizeFast;
	data.object.world.solver = {};
	data.object.world.solver.tolerance = this.world.solver.tolerance;
	data.object.world.solver.iterations = this.world.solver.iterations;

	return data;
};

export {Scene};
