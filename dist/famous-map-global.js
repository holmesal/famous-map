/* @author: Jackson Lima (jackson7am)
   @license MIT
   @copyright 2014
*/

/*
$public.$public.MapUtility
$public.MapTransition -> $public.MapUtility
$public.MapModifier -> ($public.MapUtility, $private.Transform)
$public.MapPositionTransitionable -> ($public.MapUtility, Transitionable)
$public.MapStateModifier -> ($public.MapModifier, MapPositionTransionable)
$public.MapView -> ($public.MapUtility, $public.MapPositionTransitionable, $public.MapTransition, $private.Surface,
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

    $private._globalMapViewId = 1;

    /**
     * @class
     * @alias module:$public.MapUtility
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
     * @alias module:$public.MapTransition
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
     * @param {$public.MapView} options.mapView The $public.MapView.
     * @param {LatLng} [options.position] Initial geographical coordinates.
     * @param {LatLng} [options.offset] Displacement offset in geographical coordinates from the position.
     * @param {LatLng | object | function} [options.rotateTowards] Position to rotate the renderables towards.
     * @param {number} [options.zoomBase] Base zoom-level at which the renderables are displayed in their true size.
     * @param {number | function} [options.zoomScale] Customer zoom-scaling factor or function.
     * @alias module:$public.MapModifier
     */
    $public.MapModifier = function MapModifier(options) {

        this.mapView = options.mapView;

        this._output = {
            transform: $private.Transform.identity,
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
     * `new Modifier({transform: $private.Transform.rotateZ(Math.PI/2)})`
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
     *    target component.  This is similar to render() for $private.Surfaces.
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
                this._cache.scale = $private.Transform.scale(scaling, scaling, 1.0);
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
                    lat: $public.MapUtility.lat(position) + $public.MapUtility.lat(this._offset),
                    lng: $public.MapUtility.lng(position) + $public.MapUtility.lng(this._offset)
                };
            }

            // Calculate rotation transform
            var rotateTowards = this._rotateTowardsGetter ? this._rotateTowardsGetter() : this._rotateTowards;
            if (rotateTowards) {
                var rotation = $public.MapUtility.rotationFromPositions(position, rotateTowards);
                if (this._cache.rotation !== rotation) {
                    this._cache.rotation = rotation;
                    this._cache.rotate = $private.Transform.rotateZ(rotation);
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
                this._cache.translate = $private.Transform.translate(point.x, point.y, 0);
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
                transform = transform ? $private.Transform.multiply(this._cache.rotate, transform) : this._cache.rotate;
            }
            if (this._cache.translate) {
                transform = transform ? $private.Transform.multiply(this._cache.translate, transform) : this._cache.translate;
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
    $public.MapPositionTransitionable = function MapPositionTransitionable(position) {
        this.position = new $private.Transitionable([0, 0]);
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
        var latlng = [$public.MapUtility.lat(position), $public.MapUtility.lng(position)];
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
        var latlng = [$public.MapUtility.lat(position), $public.MapUtility.lng(position)];
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

    /**
     * @class
     * @param {Object} options Options.
     * @param {$public.MapView} options.mapView The $public.MapView.
     * @param {LatLng} [options.position] Initial geographical coordinates.
     * @param {LatLng} [options.offset] Displacement offset in geographical coordinates from the position.
     * @param {LatLng} [options.rotateTowards] Position to rotate the renderables towards.
     * @param {number} [options.zoomBase] Base zoom-level at which the renderables are displayed in their true size.
     * @param {number|function} [options.zoomScale] Custom zoom-scaling factor or function.
     * @alias module:$public.MapStateModifier
     */
    $public.MapStateModifier = function MapStateModifier(options) {
        this.mapView = options.mapView;
        this._positionState = new $public.MapPositionTransitionable(options.position);
        this._rotateTowardsState = new $public.MapPositionTransitionable(options.rotateTowards);

        this._modifier = new $public.MapModifier({
            mapView: this.mapView
        });

        if (options.position) {
            this.setPosition(options.position);
        }
        if (options.rotateTowards) {
            this.rotateTowards(options.rotateTowards);
        }
        if (options.offset) {
            this.setOffset(options.offset);
        }
        if (options.zoomBase !== undefined) {
            this.setZoomBase(options.zoomBase);
        }
        if (options.zoomScale) {
            this.setZoomScale(options.zoomScale);
        }
    }

    /**
     * Set the geographical position of the renderables, by adding the new position to the chain of transitions.
     *
     * @param {LatLng} position New position in geographical coordinates (Latitude, Longitude).
     * @param {Transition} [transition] Famo.us transitionable object.
     * @param {Function} [callback] callback to call after transition completes.
     */
    $public.MapStateModifier.prototype.setPosition = function(position, transition, callback) {
        this._positionState.set(position, transition, callback);
        return this;
    };

    /**
     * Set the destination geographical position to rotate the renderables towards, by adding them.
     * to the chain of transitions.
     * The child renderables are assumed to be rotated to the right by default.
     * To change the base rotation, add a rotation-transform to the renderable, like this:
     * `new Modifier({transform: $private.Transform.rotateZ(Math.PI/2)})`
     *
     * @param {LatLng} position Destination position in geographical position to rotate towards.
     * @param {Transition} [transition] Famo.us transitionable object.
     * @param {Function} [callback] callback to call after transition completes.
     */
    $public.MapStateModifier.prototype.rotateTowards = function(position, transition, callback) {
        this._rotateTowardsState.set(position, transition, callback);
    };

    /**
     * Set the base zoom-level. When set, auto-zooming is effectively enabled.
     * The renderables are then displayed in their true size when the map zoom-level equals zoomBase.
     *
     * @param {Number} zoomBase Map zoom-level
     */
    $public.MapStateModifier.prototype.setZoomBase = function(zoomBase) {
        this._modifier.zoomBaseFrom(zoomBase);
        return this;
    };

    /**
     * Set the zoom-scale (ignored when zoomBase is not set). When set, the scale is increased when zooming in and
     * decreased when zooming-out. The zoomScale can be either a Number or a Function which returns
     * a scale-factor, with the following signature: function (zoomBase, zoomCurrent).
     *
     * @param {Number|Function} zoomScale Zoom-scale factor or function.
     */
    $public.MapStateModifier.prototype.setZoomScale = function(zoomScale) {
        this._modifier.zoomScaleFrom(zoomScale);
        return this;
    };

    /**
     * Set the displacement offset in geographical coordinates.
     *
     * @param {LatLng} offset Displacement offset in geographical coordinates.
     */
    $public.MapStateModifier.prototype.setOffset = function(offset) {
        this._modifier.offsetFrom(offset);
        return this;
    };

    /**
     * Get the current geographical position.
     *
     * @return {LatLng} Position in geographical coordinates.
     */
    $public.MapStateModifier.prototype.getPosition = function() {
        return this._positionState.get();
    };

    /**
     * Get the geographical position towards which the renderables are currently rotated.
     *
     * @return {LatLng} Destination geographical position towards which renderables are rotated.
     */
    $public.MapStateModifier.prototype.getRotateTowards = function() {
        return this._rotateTowardsState.get();
    };

    /**
     * Get the destination geographical position.
     *
     * @return {LatLng} Position in geographical coordinates.
     */
    $public.MapStateModifier.prototype.getFinalPosition = function() {
        return this._positionState.getFinal();
    };

    /**
     * Get the destination geographical position which the renderables should be rotated towards.
     *
     * @return {LatLng} Position in geographical coordinates.
     */
    $public.MapStateModifier.prototype.getFinalRotateTowards = function() {
        return this._rotateTowardsState.getFinal();
    };

    /**
     * Get the base zoom-level. The zoomBase indicates the zoom-level at which renderables are
     * displayed in their true size.
     *
     * @return {Number} Base zoom level
     */
    $public.MapStateModifier.prototype.getZoomBase = function() {
        return this._modifier.getZoomBase();
    };

    /**
     * Get the base zoom-scale. The zoomScale can be either a Number or a Function which returns
     * a scale-factor.
     *
     * @return {Number|Function} Zoom-scale
     */
    $public.MapStateModifier.prototype.getZoomScale = function() {
        return this._modifier.getZoomScale();
    };

     /**
     * Get the geographical displacement offset.
     *
     * @return {LatLng} Offset in geographical coordinates.
     */
    $public.MapStateModifier.prototype.getOffset = function() {
        return this._modifier.getOffset();
    };

    /**
     * Halts any pending transitions.
     */
    $public.MapStateModifier.prototype.halt = function() {
        this._positionState.halt();
        this._rotateTowardsState.halt();
    };

    /**
     * Is there at least one transition pending completion?
     *
     * @return {Bool} True when there are active transitions running.
     */
    $public.MapStateModifier.prototype.isActive = function() {
        return this._positionState.isActive() || this._rotateTowardsState.isActive();
    };

    /**
     * Return render spec for this $public.MapStateModifier, applying to the provided
     *    target component.  This is similar to render() for $private.Surfaces.
     *
     * @private
     * @ignore
     *
     * @param {Object} target (already rendered) render spec to
     *    which to apply the transform.
     * @return {Object} render spec for this $public.MapStateModifier, including the
     *    provided target
     */
    $public.MapStateModifier.prototype.modify = function modify(target) {
        this._modifier.positionFrom(this._positionState.get());
        this._modifier.rotateTowardsFrom(this._rotateTowardsState.getFinal());
        return this._modifier.modify(target);
    };

    /*
     * Map-type
     * @enum {Number}
     * @alias module:$public.MapView.MapType
     */
    var MapType = {
        GOOGLEMAPS: 1,
        LEAFLET: 2
    };

    /**
     * @class
     * @param {Object} options Options.
     * @param {MapType} options.type Map-type (e.g. $public.MapView.MapType.GOOGLEMAPS, $public.MapView.MapType.LEAFLET).
     * @param {Object} options.mapOptions Options that are passed directly to the Map object. The options should include the 'center' and 'zoom'.
     * @param {String} [options.id] Id of the DOM-element to use. When ommitted, a DOM-element is created using a surface.
     * @param {Transition} [options.zoomTransition] Transition to use for smoothly zooming renderables (by default a transition of 120 ms is used).
     * @alias module:$public.MapView
     */
    $public.MapView = function MapView() {
        $private.View.apply(this, arguments);

        // Initialize
        this.map = null;
        this.mapType = this.options.type;
        this._position = new $public.MapPositionTransitionable(this.options.mapOptions.center);
        this._zoom = {
            center: new $public.MapPositionTransitionable(this.options.mapOptions.center),
            northEast: new $public.MapPositionTransitionable(this.options.mapOptions.center),
            southWest: new $public.MapPositionTransitionable(this.options.mapOptions.center)
        };
        this._cache = {};

        // Disable zoom-transitions for leaflet
        if (this.mapType === MapType.LEAFLET) {
            this.options.zoomTransition = {duration: 0};
        }

        // When a specific dom-id is specified, use that
        if (this.options.mapOptions && this.options.id) {
            this.mapId = this.options.id;
        }
        else {

            // Otherwise generate unique id, and create the div ourselves
            this.mapId = 'MapView' + $private._globalMapViewId;
            $private._globalMapViewId++;

            // Insert div into the DOM
            var surface = new $private.Surface({
                classes: ['mapview'],
                content: '<div id="' + this.mapId + '" style="width: 100%; height: 100%;"></div>',
                size: [undefined, undefined]
            });
            this.add(surface);
        }
    }
    $public.MapView.prototype = Object.create($private.View.prototype);
    $public.MapView.prototype.constructor = $public.MapView;
    $public.MapView.MapType = MapType;

    /**
     * @property DEFAULT_OPTIONS
     * @protected
     */
    $public.MapView.DEFAULT_OPTIONS = {
        type: MapType.GOOGLEMAPS,
        mapOptions: {
            zoom: 10,
            center: {lat: 51.4400867, lng: 5.4782571}
        },
        id: null,
        zoomTransition: {duration: 100}
    };

    /**
     * Initializes the map (happens after the DOM element has been created).
     *
     * @private
     * @ignore
     */
    $public.MapView.prototype._initMap = function() {

        // Try to find DOM element
        var elm = document.getElementById(this.mapId);
        if (!elm) {
            return;
        }

        // Supported map-types
        switch (this.mapType) {

        // Create google.maps.Map
        case MapType.GOOGLEMAPS:
            this.map = new google.maps.Map(elm, this.options.mapOptions);

            // Listen for the first occurance of 'projection_changed', to ensure the map is full
            // initialized.
            var func = this.map.addListener('projection_changed', function() {
                google.maps.event.removeListener(func);

                // Finalize initialisation
                this._initComplete = true;
                this._eventOutput.emit('load', this);
            }.bind(this));
            break;

        // Create leaflet Map
        case MapType.LEAFLET:
            this.map = L.map(elm, this.options.mapOptions);
            this._initComplete = true;
            this._eventOutput.emit('load', this);
            break;
        }
    };

    /**
     * Get the internal map-object. This object may not yet have been initialized, the map is only
     * guarenteed to be valid after the 'load' event has been emited.
     *
     * @return {Map} Map object.
     */
    $public.MapView.prototype.getMap = function() {
        return this.map;
    };

    /**
     * Set the center of the map to the given geographical coordinates.
     *
     * @param {LatLng} position Position in geographical coordinates.
     * @param {Transitionable} [transition] Transitionable.
     * @param {Function} [callback] callback to call after transition completes.
     */
    $public.MapView.prototype.setPosition = function(position, transition, callback) {
        this._position.set(position, transition, callback);
        this._positionInvalidated = true;
        return this;
    };

    /**
     * Get the current center position of the map, in geographical coordinates.
     *
     * @return {LatLng} Position in geographical coordinates.
     */
    $public.MapView.prototype.getPosition = function() {
        return this._zoom.center.get();
    };

    /**
     * Get the destination center position of the map, in geographical coordinates.
     *
     * @return {LatLng} Position in geographical coordinates.
     */
    $public.MapView.prototype.getFinalPosition = function() {
        return this._position.getFinal();
    };

    /**
     * Get the current zoom-level of the map, taking into account smooth transition between zoom-levels.
     * E.g., when zooming from zoom-level 4 to 5, this function returns an increasing value starting at 4 and ending
     * at 5, over time. The used zoomTransition can be set as an option.
     *
     * @return {Number} Zoom-level.
     */
    $public.MapView.prototype.getZoom = function() {
        return this._cache.zoom;
    };

    /**
     * Get the position in pixels (relative to the left-top of the container) for the given geographical position.
     *
     * @param {LatLng} position in geographical coordinates.
     * @return {Point} Position in pixels, relative to the left-top of the mapView.
     */
    $public.MapView.prototype.pointFromPosition = function(position) {
        switch (this.mapType) {
        case MapType.GOOGLEMAPS:
            if (!(position instanceof google.maps.LatLng)) {
                position = new google.maps.LatLng($public.MapUtility.lat(position), $public.MapUtility.lng(position), true);
            }
            var worldPoint = this.map.getProjection().fromLatLngToPoint(position);
            return {
                x: (worldPoint.x - this._cache.bottomLeft.x) * this._cache.scale,
                y: (worldPoint.y - this._cache.topRight.y) * this._cache.scale
            };
        case MapType.LEAFLET:
            // Note: smooth zooming is not yet supported for leaflet
            var pnt = this.map.latLngToContainerPoint(position);
            return pnt;
        }
    };

    /**
     * Get the geographical coordinates for a given position in pixels (relative to the left-top of the container).
     *
     * @param {Point} point Position in pixels, relative to the left-top of the mapView.
     * @return {LatLng} Position in geographical coordinates.
     */
    $public.MapView.prototype.positionFromPoint = function(point) {
        switch (this.mapType) {
        case MapType.GOOGLEMAPS:
            var worldPoint = new google.maps.Point(
                (point.x / this._cache.scale) + this._cache.bottomLeft.x,
                (point.y / this._cache.scale) + this._cache.topRight.y
            );
            return this.map.getProjection().fromPointToLatLng(worldPoint);
        case MapType.LEAFLET:
            // Note: smooth zooming is not yet supported for leaflet
            return this.map.containerPointToLatLng(point);
        }
    };

    /**
     * Get the size of the map-view in pixels.
     *
     * @return {Array.Number} Size of the mapView.
     */
    $public.MapView.prototype.getSize = function() {
        return this._cache.size;
    };

    /**
     * Halts any pending transitions.
     */
    $public.MapView.prototype.halt = function() {
        this._position.halt();
        this._positionInvalidated = true;
    };

    /**
     * Is there at least one action pending completion?
     *
     * @return {Bool} True when there are active transitions running.
     */
    $public.MapView.prototype.isActive = function() {
        return this._position.isActive();
    };

    /**
     * @private
     * @ignore
     */
    $public.MapView.prototype._updateCache = function(zoom, northEast, southWest) {

        // Store final data
        this._cache.finalZoom = zoom;
        this._cache.finalScale = Math.pow(2, this._cache.finalZoom);
        this._cache.finalNorthEast = northEast;
        this._cache.finalSouthWest = southWest;

        // Calculate size of the $public.MapView
        switch (this.mapType) {
        case MapType.GOOGLEMAPS:

            if (!(northEast instanceof google.maps.LatLng)) {
                northEast = new google.maps.LatLng($public.MapUtility.lat(northEast), $public.MapUtility.lng(northEast), true);
            }
            if (!(southWest instanceof google.maps.LatLng)) {
                southWest = new google.maps.LatLng($public.MapUtility.lat(southWest), $public.MapUtility.lng(southWest), true);
            }

            var topRight = this.map.getProjection().fromLatLngToPoint(northEast);
            var bottomLeft = this.map.getProjection().fromLatLngToPoint(southWest);
            this._cache.size = [
                (topRight.x - bottomLeft.x) * this._cache.finalScale,
                (bottomLeft.y - topRight.y) * this._cache.finalScale
            ];
            break;
        case MapType.LEAFLET:
            var point = this.map.getSize();
            this._cache.size = [point.x, point.y];
            break;
        }

        // Calculate current world point edges and scale
        switch (this.mapType) {
        case MapType.GOOGLEMAPS:

            northEast = this._zoom.northEast.get();
            southWest = this._zoom.southWest.get();
            if (!(northEast instanceof google.maps.LatLng)) {
                northEast = new google.maps.LatLng($public.MapUtility.lat(northEast), $public.MapUtility.lng(northEast), true);
            }
            if (!(southWest instanceof google.maps.LatLng)) {
                southWest = new google.maps.LatLng($public.MapUtility.lat(southWest), $public.MapUtility.lng(southWest), true);
            }

            this._cache.topRight = this.map.getProjection().fromLatLngToPoint(northEast);
            this._cache.bottomLeft = this.map.getProjection().fromLatLngToPoint(southWest);
            this._cache.scale = this._cache.size[0] / (this._cache.topRight.x - this._cache.bottomLeft.x);
            this._cache.zoom = Math.log(this._cache.scale) / Math.log(2);
            break;
        case MapType.LEAFLET:

            // Note: smooth zooming is not yet supported for leaflet
            this._cache.zoom = zoom;
            break;
        }
    };

    /**
     * Get map-information from the underlying map-provider, such as position, bounds, zoom-level...
     *
     * @private
     * @ignore
     */
    $public.MapView.prototype._getMapInfo = function() {
        var bounds;
        var northEast;
        var southWest;
        var center;
        var zoom;
        switch (this.mapType) {
        case MapType.GOOGLEMAPS:

            // map.getBounds() returns the northEast and southWest in wrapped coordinates (between -180..180).
            // This makes it difficult to create a linear coordinate space for converting world-coordinates
            // into pixels. This function therefore 'unwraps' the northEast and southWest coordinates using
            // * map.getCenter() (which does return unwrapped coordinates).
            bounds = this.map.getBounds();
            center = this.map.getCenter();
            zoom = this.map.getZoom();

            var centerLng = $public.MapUtility.lng(center);

            northEast = bounds.getNorthEast();
            var northEastLng = northEast.lng();
            while (northEastLng < centerLng) {
                northEastLng += 360;
            }
            while (northEastLng > (centerLng + 360)) {
                northEastLng -= 360;
            }

            southWest = bounds.getSouthWest();
            var southWestLng = southWest.lng();
            while (southWestLng < (centerLng - 360)) {
                southWestLng += 360;
            }
            while (southWestLng > centerLng) {
                southWestLng -= 360;
            }

            return {
                zoom: zoom,
                center: {lat: center.lat(), lng: center.lng()},
                southWest: {lat: southWest.lat(), lng: southWestLng},
                northEast: {lat: northEast.lat(), lng: northEastLng}
            };
        case MapType.LEAFLET:
            bounds = this.map.getBounds();
            southWest = bounds.getSouthWest();
            northEast = bounds.getNorthEast();
            center = this.map.getCenter();
            zoom = this.map.getZoom();
            return {
                zoom: zoom,
                center: {lat: center.lat, lng: center.lng},
                southWest: {lat: southWest.lat, lng: southWest.lng},
                northEast: {lat: northEast.lat, lng: northEast.lng}
            };
        }
    };

    /**
     * Renders the view.
     *
     * @private
     * @ignore
     */
    $public.MapView.prototype.render = function render() {

        // Init the map (once)
        if (!this.map) {
            this._initMap();
        }
        if (this._initComplete) {

            // When the zoom-level is changed by the map, start a transition
            // that runs alongside.
            var options;
            var info = this._getMapInfo();
            var invalidateCache = false;
            if (info.zoom !== this._cache.finalZoom) {
                this._zoom.northEast.halt();
                this._zoom.southWest.halt();
                this._zoom.center.halt();
                this._zoom.northEast.set(info.northEast, this.options.zoomTransition);
                this._zoom.southWest.set(info.southWest, this.options.zoomTransition);
                this._zoom.center.set(info.center, this.options.zoomTransition);
                invalidateCache = true;
            } else if (!this._zoom.northEast.isActive()) {
                this._zoom.northEast.reset(info.northEast);
                this._zoom.southWest.reset(info.southWest);
                this._zoom.center.reset(info.center);
            }
            else {
                this._zoom.northEast.get(); // ensure that .get() always gets called to ensure that isActive() works
                invalidateCache = true;
            }

            // Update the cache
            if (invalidateCache || (info.zoom !== this._cache.finalZoom) ||
                    !$public.MapUtility.equals(info.northEast, this._cache.finalNorthEast) ||
                    !$public.MapUtility.equals(info.southWest, this._cache.finalSouthWest)) {
                //console.log('updating cache..');
                this._updateCache(info.zoom, info.northEast, info.southWest);
            }

            // Get/set map center
            if (this._position.isActive() || this._positionInvalidated) {
                options = {
                    center: this._position.get()
                };
                this._positionInvalidated = false;
            }
            else {
                this._position.reset(info.center);
            }
            if (options) {
                switch (this.mapType) {
                case MapType.GOOGLEMAPS:
                    this.map.setOptions(options);
                    break;
                case MapType.LEAFLET:
                    this.map.panTo(options.center, {animate: false});
                    break;
                }
            }
        }

        // Call super
        return this._node.render();
    };


    return $public;
}());
