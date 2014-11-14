/* @author: Jackson Lima (jackson7am)
   @license MIT
   @copyright 2014
*/

/*
MapUtility
MapTransition -> MapUtility
MapModifier -> (MapUtility, Transform)
MapPositionTransitionable -> (MapUtility, Transitionable)
MapStateModifier -> (MapModifier, MapPositionTransionable)
MapView -> (MapUtility, MapPositionTransitionable, MapTransition, Surface,
  View, Transitionable)
*/

var famous_map = (function () {
    'use strict'

    var $private, $public;

    $private = {};
    $public = {};

    return $public;
}());
