/* @author: Jackson Lima (jackson7am)
   @license MIT
   @copyright 2014
*/

/*
$public.$public.MapUtility
$public.MapTransition -> $public.MapUtility
MapModifier -> ($public.MapUtility, Transform)
MapPositionTransitionable -> ($public.MapUtility, Transitionable)
MapStateModifier -> (MapModifier, MapPositionTransionable)
MapView -> ($public.MapUtility, MapPositionTransitionable, $public.MapTransition, Surface,
  View, Transitionable)
*/

var famous_map = (function () {
    'use strict'

    var $private, $public;

    $private = {};
    $public = {};

    $private.Surface = famous.core.Surface;
    $private.View = famous.core.View;
    $private.Transform = famous.core.Transform;
    $private.Transitionable = famous.transitions.Transitionable;

    // For test use
    $public.print = function () {
      console.log($private.Transform);
      console.log($private.Transitionable);
      console.log($private.Surface);
      console.log($private.View);
    };

    
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

    /**
     * @class
     * @alias module:MapTransition
     */
    $public.MapTransition = function MapTransition(){

        this.state = undefined;

        this._startTime = 0;
        this._startState = 0;
        this._updateTime = 0;
        this._endState = 0;
        this._active = false;
        this._duration = 0;
        this._distance = 0;
        this._callback = undefined;
    }

    $public.MapTransition.SUPPORTS_MULTIPLE = 2;

    /**
     * @property DEFAULT_OPTIONS
     * @protected
     */
    $public.MapTransition.DEFAULT_OPTIONS = {

        /**
         * The speed of the transition in mph.
         */
        speed : 1000 // mph
    };

    // Interpolate: If a linear function f(0) = a, f(1) = b, then return f(t)
    function _interpolate(a, b, t) {
        return ((1 - t) * a) + (t * b);
    }
    function _clone(obj) {
        return obj.slice(0);
    }

    /**
     * Resets the position
     *
     * @param {Array.Number} state Array: [lat, lng]
     */
    $public.MapTransition.prototype.reset = function reset(state) {
        if (this._callback) {
            var callback = this._callback;
            this._callback = undefined;
            callback();
        }

        this.state = _clone(state);

        this._startTime = 0;
        this._updateTime = 0;
        this._startState = this.state;
        this._endState = this.state;
        this._duration = 0;
        this._distance = 0;
        this._active = false;
    };

    /**
     * Set the end position and transition, with optional callback on completion.
     *
     * @param {Array.Number} state Array: [lat,lng]
     * @param {Object} [transition] Transition definition
     * @param {Function} [callback] Callback
     */
    $public.MapTransition.prototype.set = function set(state, transition, callback) {

        if (!transition) {
            this.reset(state);
            if (callback) {
                callback();
            }
            return;
        }

        this._speed = $public.MapTransition.DEFAULT_OPTIONS.speed;
        if (transition && transition.speed) {
            this._speed = transition.speed;
        }

        this._startState = this.get();
        this._startTime = Date.now();
        this._endState = _clone(state);
        this._active = true;
        this._callback = callback;
        this._distance = $public.MapUtility.distanceBetweenPositions(this._startState, this._endState);
        this._duration = (this._distance / this._speed) * (60 * 60 * 1000);
        //console.log('distance: ' + this._distance + ' km, speed: ' + transition.speed + 'km/h, duration:' + this._duration + ' ms');
    };

    /**
     * Get the current position of the transition.
     *
     * @param {Date} [timestamp] Timestamp at which to get the position
     * @return {Array.Number} Array: [lat, lng]
     */
    $public.MapTransition.prototype.get = function get(timestamp) {
        if (!this._active) {
            if (this._callback) {
                var callback = this._callback;
                this._callback = undefined;
                callback();
            }
            return this.state;
        }

        if (!timestamp) {
            timestamp = Date.now();
        }
        if (this._updateTime >= timestamp) {
            return this.state;
        }
        this._updateTime = timestamp;

        var timeSinceStart = timestamp - this._startTime;
        if (timeSinceStart >= this._duration) {
            this.state = this._endState;
            this._active = false;
        } else if (timeSinceStart < 0) {
            this.state = this._startState;
        }
        else {
            var t = timeSinceStart / this._duration;
            var lat = _interpolate(this._startState[0], this._endState[0], t);
            var lng = _interpolate(this._startState[1], this._endState[1], t);
            this.state = [lat, lng];
        }

        return this.state;
    };

    /**
     * Detects whether a transition is in progress
     *
     * @return {Boolean}
     */
    $public.MapTransition.prototype.isActive = function isActive() {
        return this._active;
    };

    /**
     * Halt the transition
     */
    $public.MapTransition.prototype.halt = function halt() {
        this.set(this.get());
    };

    return $public;
}());
