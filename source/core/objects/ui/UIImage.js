import {DoubleSide, PlaneGeometry, Mesh, MeshBasicMaterial, Object3D} from "three";

function UIImage()
{
	var geometry = new PlaneGeometry(1, 1);
	geometry.translate(0, 0, 0.001);
	var material = new MeshBasicMaterial({color: 0x030303, side: DoubleSide});
	geometry.name = material.name = "image";
	var instance = Reflect.construct(Mesh, [geometry, material], new.target || UIImage);
	instance.type = "UIImage";
	instance.name = "image";
	return instance;
}

UIImage.prototype = Object.create(Mesh.prototype);
UIImage.prototype.constructor = UIImage;

export {UIImage};
