import {SkinnedMesh, MeshBasicMaterial} from "three";

function SkinnedWireframeHelper(object, hex)
{
	var instance = Reflect.construct(SkinnedMesh, [object.geometry, new MeshBasicMaterial(
		{
			color: hex !== undefined ? hex : 0xFFFFFF,
			wireframe: true,
			skinning: true
		})], new.target || SkinnedWireframeHelper);

	instance.object = object;
	instance.matrixAutoUpdate = false;
	instance.update();

	return instance;
}

SkinnedWireframeHelper.prototype = Object.create(SkinnedMesh.prototype);

SkinnedWireframeHelper.prototype.update = function()
{
	this.geometry = this.object.geometry;
	this.matrix.copy(this.object.matrixWorld);
};

export {SkinnedWireframeHelper};
