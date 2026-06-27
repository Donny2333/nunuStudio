import {Group as TGroup} from "three";

/**
 * Groups are used to group objects together.
 *
 * They are not drawn in the scene are just used as logic containers.
 *
 * @class Group
 * @extends {Group}
 * @module Misc
 */
function Group()
{
	var instance = Reflect.construct(TGroup, [], new.target || Group);
	instance.name = "group";
	instance.type = "Group";
	return instance;
}

Group.prototype = Object.create(TGroup.prototype);
Group.prototype.constructor = Group;

export {Group};
