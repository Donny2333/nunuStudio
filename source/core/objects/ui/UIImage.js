import {DoubleSide, PlaneBufferGeometry, Mesh, MeshBasicMaterial, Object3D} from "three";

function UIImage()
{
	var geometry = new PlaneBufferGeometry(1, 1);
	geometry.translate(0, 0, 0.001);
	var material = new MeshBasicMaterial({color: 0x030303, side: DoubleSide});
	geometry.name = material.name = "image";
	Mesh.call(this, geometry, material);
	this.type = "UIImage";
	this.name = "image";
}

UIImage.prototype = Object.create(Mesh.prototype);
UIImage.prototype.constructor = UIImage;

export {UIImage};
