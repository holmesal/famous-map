/*
 * Copyright (c) 2014 Gloey Apps
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * Owner: hrutjes@gmail.com
 * @license MIT
 * @copyright Gloey Apps, 2014
 */

/*jslint browser:true, nomen:true, vars:true, plusplus:true*/
/*global define, google*/


'use strict';

// import dependencies
var Engine = famous.core.Engine;
var Modifier = famous.core.Modifier;
var Surface = famous.core.Surface;
var ImageSurface = famous.surfaces.ImageSurface;
var Transform = famous.core.Transform;
var Easing = famous.transitions.Easing;
var Timer = famous.utilities.Timer;
var MapView = famous_map.MapView;
var MapModifier = famous_map.MapModifier;
var MapStateModifier = famous_map.MapStateModifier;

// create the main context
var mainContext = Engine.createContext();

// Create FPS indicator
_createFPS(mainContext);

// Create map-view
var mapView = _createMapView(mainContext);

// Wait for the map to load and initialize
mapView.on('load', function () {

    // Create map items
    var homer = _createHomer(mainContext, mapView);
    _createArrow(mainContext, mapView, homer);
    _createMarge(mainContext, mapView, homer);
    _createPins(mainContext, mapView);
    _createSaucer(mainContext, mapView);

    // Transitions are chained. The following example first pans to the position twice
    // and then zooms in. Use '.halt' to cancel the transitions and start new ones.
    mapView.setPosition(
        { lat: 51.8721795, lng: 5.7101037},
        { duration: 4000, curve: Easing.outQuad }
    );
    mapView.setPosition(
        { lat:51.4400867, lng: 5.4782571},
        { duration: 4000, curve: Easing.outQuad },
        function () {
            mapView.getMap().setZoom(14);
        }
    );

    // Homer is taking a road-trip
    var i, j, trip = [
        { lat:51.8721795, lng: 5.7101037},
        { lat: 51.4400867, lng: 5.4782571}
    ];
    homer.rotateTowards(trip[0], { duration: 200 });
    for (j = 0; j < trip.length; j++) {
        homer.setPosition(trip[j], { duration: 4000, curve: Easing.outQuad }, function (j) {
            if ((j + 1) < trip.length) {
                homer.rotateTowards(trip[j + 1], { duration: 200 });
            }
        }.bind(this, j));
    }

    // Drive circles around town until homer gets tired of it
    var roundabout = [
        {lat: 51.4347897, lng: 5.452068},
        {lat: 51.4470413, lng: 5.4474332},
        {lat: 51.4520125, lng: 5.4643767},
        {lat: 51.4524705, lng: 5.4941894},
        {lat: 51.4383345, lng: 5.5051329},
        {lat: 51.4284487, lng: 5.5016138},
        {lat: 51.4237288, lng: 5.4911202},
        {lat: 51.4250333, lng: 5.474351},
        {lat: 51.4286323, lng: 5.4603713},
        {lat: 51.4315555, lng: 5.4541915}
    ];
    homer.rotateTowards(roundabout[0]);
    for (i = 0; i < 10; i++) {
        for (j = 0; j < roundabout.length; j++) {
            //homer.rotateTowards(roundabout[j], { duration: 100, curve: Easing.outQuad });
            homer.setPosition(roundabout[j], { duration: 2000 }, function (j) {
                if ((j + 1) < roundabout.length) {
                    homer.rotateTowards(roundabout[j + 1], { duration: 200 });
                } else {
                    homer.rotateTowards(roundabout[0], { duration: 200 });
                }
            }.bind(this, j));
        }
    }

    // Show info-box with a slight delay
    Timer.setTimeout(function () {
        _createInfoBox(mainContext, mapView);
    }, 8000);
});

/**
 * Creates the FPS-indicator in the right-top corner.
 *
 * @method _createFPS
 * @private
 */
function _createFPS(context) {

    // Render FPS in right-top
    var modifier = new Modifier({
        align: [1, 0],
        origin: [1, 0],
        size: [100, 50]
    });
    var surface = new Surface({
        content: 'fps',
        classes: ['fps']
    });
    context.add(modifier).add(surface);

    // Update every 5 ticks
    Timer.every(function () {
        surface.setContent(Math.round(Engine.getFPS()) + ' fps');
    }, 2);
}

/**
 * @method _createMapView
 * @private
 */
function _createMapView(context) {
    var mapView = new MapView({
        mapOptions: {
            zoom: 10,
            center: {lat: 52.3747158, lng: 4.8986166},
            disableDefaultUI: false,
            disableDoubleClickZoom: true,
            mapTypeId: google.maps.MapTypeId.TERRAIN
        }
    });
    context.add(mapView);
    return mapView;
}

/**
 * @method _createArrow
 * @private
 */
function _createArrow(context, mapView, homer) {

    // Create the homer-mobile which travels across the map
    var surface = new ImageSurface({
        size: [true, true],
        classes: ['arrow'],
        content: 'images/arrow.png'
    });
    var center = new Modifier({
        align: [0, 0],
        origin: [0.5, 0.5]
    });
    var rotation = new Modifier({
        transform: Transform.rotateZ(Math.PI / 2)
    });
    var modifier = new MapModifier({
        mapView: mapView,
        position: {lat: 51.4367399, lng: 5.4812397},
        rotateTowards: homer,
        zoomBase: 14
    });
    context.add(modifier).add(center).add(rotation).add(surface);
    return modifier;
}

/**
 * @method _createHomer
 * @private
 */
function _createHomer(context, mapView) {

    // Create the homer-mobile which travels across the map
    var surface = new ImageSurface({
        size: [80, true],
        classes: ['car'],
        content: 'images/homer.png'
    });
    var center = new Modifier({
        align: [0, 0],
        origin: [0.5, 0.5],
        transform: Transform.rotateZ((Math.PI / 180) * -11)
    });
    var modifier = new MapStateModifier({
        mapView: mapView,
        position: {lat: 52.3747158, lng: 4.8986166}
    });
    context.add(modifier).add(center).add(surface);
    return modifier;
}

/**
 * @method _createMarge
 * @private
 */
function _createMarge(context, mapView, homer) {
    var modifier = new MapModifier({
        mapView: mapView,
        position: {lat: 51.8538331, lng: 5.3576616}
    });
    var center = new Modifier({
        align: [0, 0],
        origin: [0.5, 0.5]
    });
    var surface = new ImageSurface({
        size: [true, true],
        classes: ['marge'],
        content: 'images/marge.png'
    });
    context.add(modifier).add(center).add(surface);
    return modifier;
}

/**
 * @method _createInfoBox
 * @private
 */
function _createInfoBox(context, mapView) {
    var modifier = new Modifier({
        align: [1, 1],
        origin: [1, 1],
        transform: Transform.translate(-30, -30, 0)
    });
    var surface = new Surface({
        size: [200, 160],
        content: 'Move the map by hand and see how renderables stick to the map.',
        classes: ['info']
    });
    context.add(modifier).add(surface);
    return modifier;
}

/**
 * @method _createPins
 * @private
 */
function _createPins(context, mapView) {
    var modifier = new MapModifier({
        mapView: mapView,
        position: {lat: 51.4452133, lng: 5.4806269},
        zoomBase: 14,
        zoomScale: 0.5
    });
    var center = new Modifier({
        align: [0, 0],
        origin: [0.5, 0.5]
    });
    var surface = new ImageSurface({
        size: [true, true],
        content: 'images/pins.png',
        classes: ['pins']
    });
    context.add(modifier).add(center).add(surface);
    return modifier;
}

/**
 * @method _createSaucer
 * @private
 */
function _createSaucer(context, mapView) {
    var modifier = new MapModifier({
        mapView: mapView,
        position: {lat: 51.443569, lng: 5.446869},
        zoomBase: 15,
        zoomScale: 1
    });
    var center = new Modifier({
        align: [0, 0],
        origin: [0.5, 0.5]
    });
    var surface = new ImageSurface({
        size: [true, true],
        content: 'images/evoluon.png',
        classes: ['saucer']
    });
    context.add(modifier).add(center).add(surface);
    return modifier;
}
