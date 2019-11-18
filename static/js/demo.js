
window.myPolyline= null;
window.myMarker = null;
window.routeWaypoints = [
  [34.056992, -118.242792],
  [34.101619, -118.316368],
  [34.131978, -118.350077],
  [34.170649, -118.385045],
  [34.208710, -118.405662],
  [34.246200, -118.426232],
  [34.279714, -118.450945],
  [34.315497, -118.491489],
  [34.322861, -118.499096],
  [34.370533, -118.560351],
  [34.426518, -118.586952],
  [34.494504, -118.624799],
  [34.557951, -118.673722]
]

window.evChargingStations = [
  [34.109470, -118.325349],
  [34.214449, -118.441448],
  [34.394979, -118.549281],
  [34.502543, -118.628690],
  [34.400812, -118.553950],
  [34.996138, -118.885427],
  [35.334804, -119.248127],
  [36.359040, -119.735880],
  [36.528361, -120.238939],
  [37.507599, -120.688170]
]

var START_LOC = [34.056992, -118.242792]
var END_LOC = [47.186725, -122.574551]
var NUM_EV_STOPS = 3 // GETTING REPLACED / COMING FROM MODEL

function calculateRouteFromAtoB (platform) {
  console.log("Trying to route")
  var router = platform.getRoutingService(),
    routeRequestParams = {
      mode: 'fastest;truck',
      representation: 'display',
      routeattributes : 'waypoints,summary,shape,legs',
      maneuverattributes: 'direction,action',
      waypoint0: '34.056992,-118.242792',
      waypoint1: '47.186725,-122.574551'
    };




  router.calculateRoute(
    routeRequestParams,
    onSuccess,
    onError
  );
}

function calculateRouteFromAtoBWithEVStops (platform, num_ev_stops) {
  console.log("Trying to do new route")
  var router = platform.getRoutingService(),
    routeRequestParams = {
      mode: 'fastest;truck',
      representation: 'display',
      routeattributes : 'waypoints,summary,shape,legs',
      maneuverattributes: 'direction,action',
      waypoint0: '34.056992,-118.242792',
      waypoint1: '37.592268,-121.250084',
      waypoint2: '41.567612,-122.433461',
      waypoint3: '44.703348,-122.784378',
      waypoint4: '47.186725,-122.574551',

    };   

  router.calculateRoute(
    routeRequestParams,
    onSuccessEV,
    onErrorEV
  );
}

function onSuccess(result) {
  var route = result.response.route[0];
  addRouteShapeToMap(route);
  addStartMarker(START_LOC[0], START_LOC[1])
  addEndMarker(END_LOC[0], END_LOC[1])
  // addManueversToMap(route);
}

function addStartMarker(lat,lon) {
  var startIcon = new H.map.Icon('/static/images/startmarker2.png')
  var startMarker = new H.map.Marker({ lat: lat, lng: lon }, { icon: startIcon });
  map.addObject(startMarker);
}

function addEndMarker(lat,lon) {
  var endIcon = new H.map.Icon('/static/images/endmarker.png')
  var endMarker = new H.map.Marker({ lat: lat, lng: lon }, { icon: endIcon });
  map.addObject(endMarker);
}

function onError(error) {
  alert('Can\'t reach the remote server');
}

function onSuccessEV(result) {
  var route = result.response.route[0];
  addRouteShapeToMap(route);
  addStartMarker(START_LOC[0], START_LOC[1])
  addEndMarker(END_LOC[0], END_LOC[1])
  addEVmarker(37.592268, -121.250084)
  addEVmarker(41.567612, -122.433461)
  addEVmarker(44.703348, -122.784378)
  // addManueversToMap(route);
}

function addEVmarker(lat,lon) {
  var stopIcon = new H.map.Icon('/static/images/chargeStopIcon.png')
  var stopMarker = new H.map.Marker({ lat: lat, lng: lon }, { icon: stopIcon });
  map.addObject(stopMarker);
}

function onErrorEV(error) {
  alert('Can\'t reach the remote server');
}

/**
 * Boilerplate map initialization code starts below:
 */

// set up containers for the map  + panel
var mapContainer = document.getElementById('mapdiv')
  // routeInstructionsContainer = document.getElementById('panel');

//Step 1: initialize communication with the platform
// In your own code, replace variable window.apikey with your own apikey
var platform = new H.service.Platform({
  apikey: window.apikey
});

var defaultLayers = platform.createDefaultLayers();

//Step 2: initialize a map - this map is centered over Berlin

var map = new H.Map(mapContainer,
  defaultLayers.vector.normal.map,{
  center: {lat:36.043479, lng:-120.965096},
  zoom: 5,
  pixelRatio: window.devicePixelRatio || 1
});
// add a resize listener to make sure that the map occupies the whole container
window.addEventListener('resize', () => map.getViewPort().resize());

//Step 3: make the map interactive
// MapEvents enables the event system
// Behavior implements default interactions for pan/zoom (also on mobile touch environments)
var behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

// Create the default UI components
var ui = H.ui.UI.createDefault(map, defaultLayers);

// Hold a reference to any infobubble opened
var bubble;

/**
 * Opens/Closes a infobubble
 * @param  {H.geo.Point} position     The location on the map.
 * @param  {String} text              The contents of the infobubble.
 */
function openBubble(position, text){
 if(!bubble){
    bubble =  new H.ui.InfoBubble(
      position,
      // The FO property holds the province name.
      {content: text});
    ui.addBubble(bubble);
  } else {
    bubble.setPosition(position);
    bubble.setContent(text);
    bubble.open();
  }
}

function addMarkers(myLat, myLon) {
  var svgMarkup = '<svg width="24" height="24" ' +
    'xmlns="http://www.w3.org/2000/svg">' +
    '<rect stroke="white" fill="#1b468d" x="1" y="1" width="22" ' +
    'height="22" /><text x="12" y="18" font-size="12pt" ' +
    'font-family="Arial" font-weight="bold" text-anchor="middle" ' +
    'fill="white">H</text></svg>';

  // Create an icon, an object holding the latitude and longitude, and a marker:

  var icon = new H.map.Icon(svgMarkup),
    coords = {lat: myLat, lng: myLon};

  window.myMarker = new H.map.Marker(coords, {icon: icon});

  // Add the marker to the map and center the map at the location of the marker:
  map.addObject(window.myMarker);
  // map.setCenter(coords);  
}

function removeMarkers() {
  map.removeObject(window.myMarker)
}



/**
 * Creates a H.map.Polyline from the shape of the route and adds it to the map.
 * @param {Object} route A route as received from the H.service.RoutingService
 */
// var myPolyline;
function addRouteShapeToMap(route){
  var lineString = new H.geo.LineString(),
    routeShape = route.shape;

  routeShape.forEach(function(point) {
    var parts = point.split(',');
    lineString.pushLatLngAlt(parts[0], parts[1]);
  });

  window.myPolyline = new H.map.Polyline(lineString, {
    style: {
      lineWidth: 4,
      strokeColor: 'rgba(0, 12, 255, 0.7)'
    }
  });
  // Add the polyline to the map
  console.log(window.myPolyline)
  map.addObject(window.myPolyline);
  // And zoom to its bounding rectangle
  // map.getViewModel().setLookAtData({
  //   bounds: polyline.getBoundingBox()
  // });
}

function removeRoute(){
  console.log(window.myPolyline)
  map.removeObject(window.myPolyline);
}


/**
 * Creates a series of H.map.Marker points from the route and adds them to the map.
 * @param {Object} route  A route as received from the H.service.RoutingService
 */
function addManueversToMap(route){
  var svgMarkup = '<svg width="18" height="18" ' +
    'xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="8" cy="8" r="8" ' +
      'fill="#1b468d" stroke="red" stroke-width="1"  />' +
    '</svg>',
    dotIcon = new H.map.Icon(svgMarkup, {anchor: {x:8, y:8}}),
    group = new  H.map.Group(),
    i,
    j;

  // Add a marker for each maneuver
  for (i = 0;  i < route.leg.length; i += 1) {
    for (j = 0;  j < route.leg[i].maneuver.length; j += 1) {
      // Get the next maneuver.
      maneuver = route.leg[i].maneuver[j];
      // Add a marker to the maneuvers group
      var marker =  new H.map.Marker({
        lat: maneuver.position.latitude,
        lng: maneuver.position.longitude} ,
        {icon: dotIcon});
      marker.instruction = maneuver.instruction;
      group.addObject(marker);
    }
  }

  group.addEventListener('tap', function (evt) {
    map.setCenter(evt.target.getGeometry());
    openBubble(
       evt.target.getGeometry(), evt.target.instruction);
  }, false);

  // Add the maneuvers group to the map
  map.addObject(group);
}



Number.prototype.toMMSS = function () {
  return  Math.floor(this / 60)  +' minutes '+ (this % 60)  + ' seconds.';
}

function addTruckMarker(theLat, theLon) {
  var truckIcon = new H.map.Icon('/static/images/truckicon2.png')
  window.truckMarker = new H.map.Marker({ lat: theLat, lng: theLon }, { icon: truckIcon });
  map.addObject(window.truckMarker);
}

function removeTruckMarker() {
  map.removeObject(window.truckMarker)
}

function startSimulation() {
  // Place truck marker on the map at starting location
  // Find 10 waypoints on the route
  // make it animate and move
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function simulateVehicleMoving() {
    await sleep(500)
    for (i = 0; i < window.routeWaypoints.length; i+= 1) {
      currentLoc = window.routeWaypoints[i]
      currentLat = currentLoc[0]
      currentLon = currentLoc[1]
      // console.log(currentLat, currentLon)
      addTruckMarker(currentLat, currentLon)
      await sleep(1000)
      removeTruckMarker()
      await sleep(50)
    }
  }

  simulateVehicleMoving()  

}

function removeCurrentRoute() {
  map.removeObject(window.myPolyline);
}

function addRereoute() {
  calculateRouteFromAtoBWithEVStops(platform,NUM_EV_STOPS)
}

function reReroute() {
  var totalDist = distance(START_LOC[0], START_LOC[1], END_LOC[0], END_LOC[1], "M")
  console.log(totalDist)
  var getStr = "/get_num_stops?dist=" + totalDist
  console.log(getStr)
  $.get(getStr, function(data, status){
      // console.log("Data: " + data + "\nStatus: " + status);
      console.log(data['num_ev_stops'])
      NUM_EV_STOPS = data['num_ev_stops']
      removeCurrentRoute()
      addRereoute()

  });
}

function distance(lat1, lon1, lat2, lon2, unit) {
  if ((lat1 == lat2) && (lon1 == lon2)) {
    return 0;
  }
  else {
    var radlat1 = Math.PI * lat1/180;
    var radlat2 = Math.PI * lat2/180;
    var theta = lon1-lon2;
    var radtheta = Math.PI * theta/180;
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
      dist = 1;
    }
    dist = Math.acos(dist);
    dist = dist * 180/Math.PI;
    dist = dist * 60 * 1.1515;
    if (unit=="K") { dist = dist * 1.609344 }
    if (unit=="N") { dist = dist * 0.8684 }
    return dist;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  
  $('#caricon').click(function() {
    console.log("Adding route")
    calculateRouteFromAtoB (platform, 0);
  })

  $('#flakeicon').click(function() {
    console.log("Adding simulation")
    startSimulation()
  })  

  $('#batteryicon').click(function() {
    console.log("New route navigation")
    reReroute()
  })    


  // $('#addReRouteButton').click(function() {
  //   console.log("Adding route")
  //   calculateRouteFromAtoB (platform, NUM_EV_STOPS);
  // })  


  // $('#removeroutebutton').click(function() {
  //   console.log("Removing route")
  //   removeRoute()
  //   // @TODO: Remove the markers
  // })

  // $('#addmarkerbutton').click(function() {
  //   console.log("Adding markers")
  //   addMarkers(34.7963,-120.3371)
  // })

  // $('#removemarkerbutton').click(function() {
  //   console.log("Removing markers")
  //   removeMarkers()
  // })  

  // $('#animatemarkerbutton').click(function() {
  //   console.log("Animating markers")

  //   function sleep(ms) {
  //     return new Promise(resolve => setTimeout(resolve, ms));
  //   }

  //   async function myDemo() {
  //     console.log("taking a break")
  //     await sleep(2000)
  //     console.log("Ater tw sceonds here")
  //     for (i = 0; i < window.routeWaypoints.length; i+= 1) {
  //       currentLoc = window.routeWaypoints[i]
  //       currentLat = currentLoc[0]
  //       currentLon = currentLoc[1]
  //       console.log(currentLat, currentLon)

  //       addMarkers(currentLat, currentLon)
  //       await sleep(500)
  //       removeMarkers()
  //       await sleep(50)
        


  //     }
  //   }

  //   myDemo()
    
  // })    






});


























































































































