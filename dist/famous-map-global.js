/* @author: Jackson Lima (jackson7am)
   @license MIT
   @copyright 2014
*/

/*
$public.$public.MapUtility
$public.MapTransition -> $public.MapUtility
$public.MapModifier -> ($public.MapUtility, Transform)
$public.MapPositionTransitionable -> ($public.MapUtility, Transitionable)
MapStateModifier -> ($public.MapModifier, MapPositionTransionable)
MapView -> ($public.MapUtility, $public.MapPositionTransitionable, $public.MapTransition, Surface,
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

    /**
     * @class
     * @param {Object} options Options.
     * @param {MapView} options.mapView The MapView.
     * @param {LatLng} [options.position] Initial geographical coordinates.
     * @param {LatLng} [options.offset] Displacement offset in geographical coordinates from the position.
     * @param {LatLng | object | function} [options.rotateTowards] Position to rotate the renderables towards.
     * @param {number} [options.zoomBase] Base zoom-level at which the renderables are displayed in their true size.
     * @param {number | function} [options.zoomScale] Customer zoom-scaling factor or function.
     * @alias module:MapModifier
     */
    $public.MapModifier = function MapModifier(options) {

        this.mapView = options.mapView;

        this._output = {
            transform: Transform.identity,
            opacity: 1,
            origin: null,
            align: null,
            size: null,
            target: null
        };

        this._cache = {};

        this._positionGetter = null;
        this._rotateTowardsGetter = null;
        this._offset = options.offset;
        this._zoomScale = options.zoomScale;
        this._zoomBase = options.zoomBase;

        if (options.position) {
            this.positionFrom(options.position);
        }
        if (options.rotateTowards) {
            this.rotateTowardsFrom(options.rotateTowards);
        }
    }

    /**
     * Set the geographical position of the renderables.
     *
     * @param {LatLng|Function|Object} position Position in geographical coordinates.
     */
    $public.MapModifier.prototype.positionFrom = function(position) {
        if (!position) {
            this._positionGetter = null;
            this._position = null;
        } else if (position instanceof Function) {
            this._positionGetter = position;
        } else if (position instanceof Object && position.getPosition) {
            this._positionGetter = position.getPosition.bind(position);
        }
        else {
            this._positionGetter = null;
            this._position = position;
        }
        return this;
    };

    /**
     * Set the geographical position to rotate the renderables towards.
     * The child renderables are assumed to be rotated to the right by default.
     * To change the base rotation, add a rotation-transform to the renderable, like this:
     * `new Modifier({transform: Transform.rotateZ(Math.PI/2)})`
     *
     * @param {LatLng} position Geographical position to rotate towards.
     */
    $public.MapModifier.prototype.rotateTowardsFrom = function(position) {
        if (!position) {
            this._rotateTowardsGetter = null;
            this._rotateTowards = null;
        } else if (position instanceof Function) {
            this._rotateTowardsGetter = position;
        } else if (position instanceof Object && position.getPosition) {
            this._rotateTowardsGetter = position.getPosition.bind(position);
        }
        else {
            this._rotateTowardsGetter = null;
            this._rotateTowards = position;
        }
        return this;
    };

    /**
     * Set the base zoom-level. When set, auto-zooming is effectively enabled.
     * The renderables are then displayed in their true size when the map zoom-level equals zoomBase.
     *
     * @param {Number} zoomBase Map zoom-level
     */
    $public.MapModifier.prototype.zoomBaseFrom = function(zoomBase) {
        this._zoomBase = zoomBase;
        return this;
    };

    /**
     * Set the zoom-scale (ignored when zoomBase is not set). When set, the scale is increased when zooming in and
     * decreased when zooming-out. The zoomScale can be either a Number or a Function which returns
     * a scale-factor, with the following signature: function (zoomBase, zoomCurrent).
     *
     * @param {Number|Function} zoomScale Zoom-scale factor or function.
     */
    $public.MapModifier.prototype.zoomScaleFrom = function(zoomScale) {
        this._zoomScale = zoomScale;
        return this;
    };

    /**
     * Set the displacement offset in geographical coordinates.
     *
     * @param {LatLng} offset Displacement offset in geographical coordinates.
     */
    $public.MapModifier.prototype.offsetFrom = function(offset) {
        this._offset = offset;
        return this;
    };

    /**
     * Get the current geographical position.
     *
     * @return {LatLng} Position in geographical coordinates.
     */
    $public.MapModifier.prototype.getPosition = function() {
        return this._positionGetter || this._position;
    };

    /**
     * Get the geographical position towards which the renderables are rotated.
     *
     * @return {LatLng} Geographical position towards which renderables are rotated.
     */
    $public.MapModifier.prototype.getRotateTowards = function() {
        return this._rotateTowardsGetter || this._rotateTowards;
    };

    /**
     * Get the base zoom-level. The zoomBase indicates the zoom-level at which renderables are
     * displayed in their true size.
     *
     * @return {Number} Base zoom level
     */
    $public.MapModifier.prototype.getZoomBase = function() {
        return this._zoomBase;
    };

    /**
     * Get the base zoom-scale. The zoomScale can be either a Number or a Function which returns
     * a scale-factor.
     *
     * @return {Number|Function} Zoom-scale
     */
    $public.MapModifier.prototype.getZoomScale = function() {
        return this._zoomScale;
    };

    /**
     * Get the geographical displacement offset.
     *
     * @return {LatLng} Offset in geographical coordinates.
     */
    $public.MapModifier.prototype.getOffset = function() {
        return this._offset;
    };

    /**
     * Return render spec for this $public.MapModifier, applying to the provided
     *    target component.  This is similar to render() for Surfaces.
     *
     * @private
     * @ignore
     *
     * @param {Object} target (already rendered) render spec to
     *    which to apply the transform.
     * @return {Object} render spec for this $public.MapModifier, including the
     *    provided target
     */
    $public.MapModifier.prototype.modify = function modify(target) {
        var cacheInvalidated = false;

        // Calculate scale transform
        if (this._zoomBase !== undefined) {
            var scaling;
            if (this._zoomScale) {
                if (this._zoomScale instanceof Function) {
                    scaling = this._zoomScale(this._zoomBase, this.mapView.getZoom());
                }
                else {
                    var zoom = (this.mapView.getZoom() - this._zoomBase) + 1;
                    if (zoom < 0) {
                        scaling = (1 / (Math.abs(zoom) + 1)) * this._zoomScale;
                    }
                    else {
                        scaling = (1 + zoom) * this._zoomScale;
                    }
                }
            }
            else {
                scaling = Math.pow(2, this.mapView.getZoom() - this._zoomBase);
            }
            if (this._cache.scaling !== scaling) {
                this._cache.scaling = scaling;
                this._cache.scale = Transform.scale(scaling, scaling, 1.0);
                cacheInvalidated = true;
            }
        } else if (this._cache.scale) {
            this._cache.scale = null;
            this._cache.scaling = null;
            cacheInvalidated = true;
        }

        // Move, rotate, etc... based on position
        var position = this._positionGetter ? this._positionGetter() : this._position;
        if (position) {

            // Offset position
            if (this._offset) {
                position = {
                    lat: MapUtility.lat(position) + MapUtility.lat(this._offset),
                    lng: MapUtility.lng(position) + MapUtility.lng(this._offset)
                };
            }

            // Calculate rotation transform
            var rotateTowards = this._rotateTowardsGetter ? this._rotateTowardsGetter() : this._rotateTowards;
            if (rotateTowards) {
                var rotation = MapUtility.rotationFromPositions(position, rotateTowards);
                if (this._cache.rotation !== rotation) {
                    this._cache.rotation = rotation;
                    this._cache.rotate = Transform.rotateZ(rotation);
                    cacheInvalidated = true;
                }
            } else if (this._cache.rotate) {
                this._cache.rotate = null;
                this._cache.rotation = null;
                cacheInvalidated = true;
            }

            // Calculate translation transform
            var point = this.mapView.pointFromPosition(position);
            if (!this._cache.point || (point.x !== this._cache.point.x) || (point.y !== this._cache.point.y)) {
                this._cache.point = point;
                this._cache.translate = Transform.translate(point.x, point.y, 0);
                cacheInvalidated = true;
            }
        } else if (this._cache.translate) {
            this._cache.point = null;
            this._cache.translate = null;
            cacheInvalidated = true;
        }

        // Update transformation matrix
        if (cacheInvalidated) {
            var transform = this._cache.scale;
            if (this._cache.rotate) {
                transform = transform ? Transform.multiply(this._cache.rotate, transform) : this._cache.rotate;
            }
            if (this._cache.translate) {
                transform = transform ? Transform.multiply(this._cache.translate, transform) : this._cache.translate;
            }
            this._output.transform = transform;
        }

        this._output.target = target;
        return this._output;
    };

    /**
     * @class
     * @param {LatLng} [position] Default geopgraphical position
     * @alias module:$public.MapPositionTransitionable
     */
    $public.MapPositionTransitionable = function MapPositionTransionable(position) {
        this.position = new Transitionable([0, 0]);
        if (position) {
            this.set(position);
        }
    }

    /**
     * Sets the default transition to use for transitioning between position states.
     *
     * @param  {Object} transition Transition definition
     */
    $public.MapPositionTransitionable.prototype.setDefaultTransition = function setDefaultTransition(transition) {
        this.position.setDefault(transition);
    };

    /**
     * Cancel all transitions and reset to a geographical position.
     *
     * @param {LatLng} position
     */
    $public.MapPositionTransitionable.prototype.reset = function reset(position) {
        var latlng = [MapUtility.lat(position), MapUtility.lng(position)];
        this.position.reset(latlng);
        this._final = position;
    };

    /**
     * Set the geographical position by adding it to the queue of transition.
     *
     * @param {LatLng} position
     * @param {Object} [transition] Transition definition
     * @param {Function} [callback] Callback
     */
    $public.MapPositionTransitionable.prototype.set = function set(position, transition, callback) {
        var latlng = [MapUtility.lat(position), MapUtility.lng(position)];
        this.position.set(latlng, transition, callback);
        this._final = position;
        return this;
    };

    /**
     * Get the current geographical position.
     *
     * @return {LatLng}
     */
    $public.MapPositionTransitionable.prototype.get = function get() {
        if (this.isActive()) {
            var latlng = this.position.get();
            return {
                lat: latlng[0],
                lng: latlng[1]
            };
        }
        else {
            return this._final;
        }
    };

    /**
     * Get the destination geographical position.
     *
     * @return {LatLng}
     */
    $public.MapPositionTransitionable.prototype.getFinal = function getFinal() {
        return this._final;
    };

    /**
     * Determine if the transitionable is currently transitioning
     *
     * @return {Boolean}
     */
    $public.MapPositionTransitionable.prototype.isActive = function isActive() {
        return this.position.isActive();
    };

    /**
     * Halts the transition
     */
    $public.MapPositionTransitionable.prototype.halt = function halt() {
        this._final = this.get();
        this.position.halt();
    };


    return $public;
}());
