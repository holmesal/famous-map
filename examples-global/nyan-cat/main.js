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
 * @author: Hein Rutjes (IjzerenHein)
 * @license MIT
 * @copyright Gloey Apps, 2014
 */

/*jslint browser:true, nomen:true, vars:true, plusplus:true*/
/*global define, google, L*/

'use strict';

// import dependencies
var Engine = famous.core.Engine;
var Modifier = famous.core.Modifier;
var Surface = famous.core.Surface;
var ImageSurface = famous.surfaces.ImageSurface;
var Transform = famous.core.Transform;
var RenderController = famous.views.RenderController;
var RenderNode = famous.core.RenderNode;

var MapView = famous_map.MapView;
var MapModifier = famous_map.MapModifier;
var MapStateModifier = famous_map.MapStateModifier;
var MapUtility = famous_map.MapUtility;
var MapPositionTransitionable = famous_map.MapPositionTransitionable;
var MapTransition = famous_map.MapTransition;

// create the main context
var mainContext = Engine.createContext();

// Determine map-type
var mapType;
try {
    var l = L;
    mapType = MapView.MapType.LEAFLET;
} catch (err) {
    mapType = MapView.MapType.GOOGLEMAPS;
}

//
// Create map-view
//
var zoom = 10;
var center = {lat: 37.30925, lng: -122.0436444};
var mapView;
switch (mapType) {
case MapView.MapType.LEAFLET:

    // Create leaflet map-view
    mapView = new MapView({
        type: mapType,
        mapOptions: {
            zoom: zoom,
            center: center
        }
    });
    break;
case MapView.MapType.GOOGLEMAPS:

    // Create google-maps map-view
    mapView = new MapView({
        type: mapType,
        mapOptions: {
            zoom: zoom,
            center: center,
            disableDefaultUI: false,
            disableDoubleClickZoom: true,
            mapTypeId: google.maps.MapTypeId.TERRAIN
        }
    });
    break;
}
mainContext.add(mapView);

//
// Create title
//
var title = new Surface({
    size: [true, true],
    content: 'famous-map nyan-cat demo',
    classes: ['title']
});
var titleModifier = new Modifier({
    align: [0.5, 0],
    origin: [0.5, 0],
    transform: Transform.translate(0, 20, 0)
});
mainContext.add(titleModifier).add(title);


//
// Create instructions
//
var instructions = new Surface({
    size: [300, 140],
    content: 'Zoom in and out to see panning smoothness at different speeds',
    classes: ['instruction']
});
var instructionsModifier = new Modifier({
    align: [0.0, 1.0],
    origin: [0.0, 1.0]
});
mainContext.add(instructionsModifier).add(instructions);


//
// Wait for the map to load and initialize
//
mapView.on('load', function () {

    // Add Leaflet tile-layer
    if (mapType === MapView.MapType.LEAFLET) {
        L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>'
            //maxZoom: 18
        }).addTo(mapView.getMap());
    }

    // Nyan cat not showing, FIX probably method 'map-speed', same cause as demo
    //
    // Pan the map across the world
    //
    mapView.setPosition(
        {lat: 37.30925, lng: 1000},
        { method: 'map-speed', speed: 20000 }
    );


    //
    // Create nyan-cat
    //
    var cat = new ImageSurface({
        size: [true, 440],
        classes: ['cat'],
        content: 'images/nyan-cat.gif'
    });
    var catModifier = new Modifier({
        align: [0.0, 0.0],
        origin: [0.8, 0.5]
    });
    var catMapModifier = new MapModifier({
        mapView: mapView,
        position: mapView
        //position: {lat: 37.30925, lng: 1000}
    });
    var catRenderController = new RenderController();
    mainContext.add(catRenderController);
    var catRenderable = new RenderNode(catMapModifier);
    catRenderable.add(catModifier).add(cat);
    catRenderController.show(catRenderable);
    var catVisible = true;


    // Show/hide cat when map is clicked
    var button = new Surface({
        size: [160, 80],
        classes: ['button'],
        content: 'hide cat'
    });
    var buttonModifier = new Modifier({
        align: [0.95, 0.05],
        origin: [0.95, 0.05 ]
    });
    mainContext.add(buttonModifier).add(button);
    button.on('click', function () {
        if (catVisible) {
            catRenderController.hide();
            catVisible = false;
            button.setContent('show cat');
        } else {
            catRenderController.show(catRenderable);
            catVisible = true;
            button.setContent('hide cat');
        }
    });
});
