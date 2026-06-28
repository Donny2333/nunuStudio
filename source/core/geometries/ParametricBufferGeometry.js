import {ParametricGeometry} from "three/examples/jsm/geometries/ParametricGeometry.js";
import {Vector3} from "three";

/**
 * Parametric bufffer geometry are constructed from javascript code describing a parametric surface.
 *
 * A parametric function receives a (u, v) coordinate value and returns a Vector3 with the surface point for those values.
 *
 * (u, v) values are normalized and might need readjusting to match the parametric function generator domain.
 *
 * @class ParametricBufferGeometry
 * @constructor
 * @param {string} code Javascript code that receive (u: number, v: number, target?: Vector3) as parameters, the target paramter might be undefined.
 * @param {number} slices The count of slices to use for the parametric function.
 * @param {number} stacks The count of stacks to use for the parametric function.
 */
function ParametricBufferGeometry(code, slices, stacks)
{
	var generator = ParametricBufferGeometry.prototype.compile(code);

	var instance = Reflect.construct(ParametricGeometry, [generator, slices, stacks], new.target || ParametricBufferGeometry);

	instance.type = "ParametricBufferGeometry";

	instance.parameters = {
		code: code,
		slices: slices,
		stacks: stacks
	};

	return instance;
}

ParametricBufferGeometry.prototype = Object.create(ParametricGeometry.prototype);

/**
 * Compile the generator code and generate a function to be passed to the geometry generator.
 *
 * @method compile
 * @return {Function} Compiled function to calculate the position of the vertex from (U, V) coordinates.
 */
ParametricBufferGeometry.prototype.compile = function(code)
{
	try
	{
		return new Function("u, v, target", "target = target || new Vector3();\n" + code);
	}
	catch (e)
	{
		console.error("iStudio: Error occured while compiling ParametricBufferGeometry code.", e);
	}

	return function(u, v, target)
	{
		return target || new Vector3();
	};
};

export {ParametricBufferGeometry};
