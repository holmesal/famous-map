/* @author: Jackson Lima (jackson7am)
   @license MIT
   @copyright 2014
*/

/*
$public.MapUtility
MapTransition -> $public.MapUtility
MapModifier -> ($public.MapUtility, Transform)
MapPositionTransitionable -> ($public.MapUtility, Transitionable)
MapStateModifier -> (MapModifier, MapPositionTransionable)
MapView -> ($public.MapUtility, MapPositionTransitionable, MapTransition, Surface,
  View, Transitionable)
*/

var famous_map = (function () {
    'use strict'

    var $private, $public;

    $private = {};
    $public = {};

    /**
     * @class
     * @alias module:MapUtility
     */
    $public.MapUtility = {};

    /**
     * Get the latitude from the position (LatLng) object.
     *
     * @param {LatLng} position Position
     * @return {Number} Latitude in degrees
     */
    $public.MapUtility.lat = function lat(position) {
        if (position instanceof Array) {
            return position[0];
        } else if (position.lat instanceof Function) {
            return position.lat();
        }
        else {
            return position.lat;
        }
    };

    /**
     * Get the longitude from the position (LatLng) object.
     *
     * @param {LatLng} position Position
     * @return {Number} Longitude in degrees
     */
    $public.MapUtility.lng = function lng(position) {
        if (position instanceof Array) {
            return position[1];
        } else if (position.lng instanceof Function) {
            return position.lng();
        }
        else {
            return position.lng;
        }
    };

    /**
     * Compares two positions for equality.
     *
     * @param {LatLng} position1 Position 1
     * @param {LatLng} position2 Position 2
     * @return {Boolean} Result of comparison
     */
    $public.MapUtility.equals = function(position1, position2) {
        return ($public.MapUtility.lat(position1) === $public.MapUtility.lat(position2)) &&
               ($public.MapUtility.lng(position1) === $public.MapUtility.lng(position2));
    };

    /**
     * Converts degrees into radians (radians = degrees * (Math.PI / 180)).
     *
     * @param {Number} deg Degrees
     * @return {Number} radians.
     */
    $public.MapUtility.radiansFromDegrees = function(deg) {
        return deg * (Math.PI / 180);
    };

    /**
     * Calculates the rotation-angle between two given positions.
     *
     * @param {LatLng} start Start position.
     * @param {LatLng} end End position.
     * @return {Number} Rotation in radians.
     */
    $public.MapUtility.rotationFromPositions = function(start, end) {
        return Math.atan2($public.MapUtility.lng(start) - $public.MapUtility.lng(end), $public.MapUtility.lat(start) - $public.MapUtility.lat(end)) + (Math.PI / 2.0);
    };

    /**
     * Calculates the distance between two positions in kilometers.
     *
     * @param {LatLng} start Starting position
     * @param {LatLng} end End position
     * @return {Number} Distance in km
     */
    $public.MapUtility.distanceBetweenPositions = function(start, end) {

        // Taken from: http://www.movable-type.co.uk/scripts/latlong.html
        var R = 6371; // earths radius in km
        var lat1 = $public.MapUtility.radiansFromDegrees($public.MapUtility.lat(start));
        var lat2 = $public.MapUtility.radiansFromDegrees($public.MapUtility.lat(end));
        var deltaLat = $public.MapUtility.radiansFromDegrees($public.MapUtility.lat(end) - $public.MapUtility.lat(start));
        var deltaLng = $public.MapUtility.radiansFromDegrees($public.MapUtility.lng(end) - $public.MapUtility.lng(start));

        var a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        var d = R * c;
        return d;
    };

    

    return $public;
}());
