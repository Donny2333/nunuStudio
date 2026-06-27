import {Text} from "troika-three-text";

function TextSDF() 
{
	var instance = Reflect.construct(Text, [], new.target || TextSDF);

	instance.text = "text";
	instance.fontSize = 0.1;
	instance.color = 0xFFFFFF;
	instance.anchorX = "center";
	instance.anchorY = "middle";
	instance.rotation.set(Math.PI, Math.PI, Math.PI);
	instance.sync();

	return instance;
}

TextSDF.prototype = Object.create(Text.prototype);
