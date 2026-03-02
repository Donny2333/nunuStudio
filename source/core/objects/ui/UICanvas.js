import {DoubleSide, PlaneBufferGeometry, Mesh, MeshBasicMaterial, Object3D} from "three";

function UICanvas()
{
	var geometry = new PlaneBufferGeometry(1, 1);
	var material = new MeshBasicMaterial({color: 0xeeeeee, side: DoubleSide});
	Mesh.call(this, geometry, material);
	this.type = "UICanvas";
	this.name = "canvas";
}

UICanvas.prototype = Object.create(Mesh.prototype);
UICanvas.prototype.constructor = UICanvas;

UICanvas.prototype.dispose = function()
{
	if (this.material !== null && this.material.dispose !== undefined)
	{
		this.material.dispose();
	}
	if (this.geometry !== null && this.geometry.dispose !== undefined)
	{
		this.geometry.dispose();
	}

	Object3D.prototype.dispose.call(this);
};

export {UICanvas};
