import {BufferGeometry, Mesh, MeshBasicMaterial} from "three";

function UICanvas(url)
{
	this.type = "UICanvas";
	this.name = "canvas";
}

UICanvas.prototype = Object.create(Mesh.prototype);
UICanvas.prototype.constructor = UICanvas;

UICanvas.prototype.toJSON = function(meta)
{

};

export {UICanvas};
