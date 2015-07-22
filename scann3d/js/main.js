
var container, stats;

var camera, scene, renderer;

var mouseX = 0, mouseY = 0;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var xlabsUpdateEnabled = false;

var pointLight = null;

var STATE_NO_FACE = "no-face";
var STATE_INIT_HEAD = "init-head";
var STATE_HEAD_CONTROL = "head-control";

var state = STATE_NO_FACE;
var stateTimer = new Timer();

var resetTimer = new Timer();
resetTimer.setDuration( 2500 ); // when person absent 2.5 second, only then reset head origin

var progress = 0;

function paintInit() { 
  
  var ctx = Canvas.context;

  // paints the initialization cue - a shrinking circle that forces the view to the centre
  ctx.fillStyle = "rgba(236, 91, 35, 1.0)";
  ctx.beginPath();    
  ctx.rect( 0,0, ctx.canvas.width, ctx.canvas.height );
  ctx.fill();

  var oldMode = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'destination-out';

  var xy = { x:window.innerWidth/2, y:window.innerHeight/2 };
  var d = Math.sqrt( screen.width*screen.width + screen.height*screen.height );
  var frac = stateTimer.elapsedFrac();

  var radiusMin = screen.height/20;
  var radiusMax = d/2;
  if( frac < 0.6 ) { // shrink
    frac = frac / 0.6; // scale from 0 to 1
    var radius = ( 1 - frac ) * ( radiusMax - radiusMin ) + radiusMin;
  }
  else if( frac < 0.8 ) { // dwell a little bit
    // console.log( "Dwelling" );
    resetHeadOrigin();
    var radius = radiusMin;
  }
  else { // expand
    frac = (frac-0.8)/0.2; // scale from 0 to 1
    var radius = frac * ( radiusMax - radiusMin ) + radiusMin;
  }

  // console.log( "Timer elapsedFrac(): " + stateTimer.elapsedFrac() );

  ctx.fillStyle = "rgba(255, 255, 255, 1.0)";
  ctx.beginPath();
  ctx.arc( xy.x, xy.y, radius, 0, 2 * Math.PI, false);
  ctx.fill();

  ctx.globalCompositeOperation = oldMode;
}




function resetCamera() {
  return {
    distance: 20,
    azmimuth: 0,
    elevation: 45,

    azmimuthRate: 0, // degrees per second
    elevationRate: 0, // degrees per second
  }
}

var xlCamera = resetCamera();


function rad(deg) {
  return deg*Math.PI/180;
}

function deg(rad) {
  return rad*180/Math.PI;
}

function init() {

  // Animate loading text  
  (function loadingAnimation() {
    setTimeout( loadingAnimation, 500 );
    var loadingElement = document.getElementById("loading-text");
    loadingElement.innerHTML = progress + "% complete";

//    var L1 = "Loading.&nbsp;&nbsp;";
//    var L2 = "Loading..&nbsp;";
//    var L3 = "Loading...";
//    if( loading.innerHTML == L1 ) loading.innerHTML = L2;
//    else if( loading.innerHTML == L2 ) loading.innerHTML = L3;
//    else loading.innerHTML = L1;
  })();


  container = document.createElement( 'div' );
  document.body.appendChild( container );

  camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
  camera.position.z = xlCamera.distance;

  // scene

  scene = new THREE.Scene();

  var ambient = new THREE.AmbientLight( 0xffffff );
  scene.add( ambient );

  // var directionalLight = new THREE.DirectionalLight( 0xffeedd );
  // directionalLight.position.set( 0, 0, 1 ).normalize();
  // scene.add( directionalLight );

  // pointLight = new THREE.PointLight( 0xe0e0ff, 1, 0 );
  // pointLight.position.set( 0, 0, xlCamera.distance );
  // scene.add( pointLight );

  // model
   

  var onProgress = function ( xhr ) {
    if ( xhr.lengthComputable ) {
      var percentComplete = xhr.loaded / xhr.total * 100;
      progress = Math.round(percentComplete, 2);//Math.floor( percentComplete );
      console.log(  progress+ '% completed' );
    }
  };

  var onError = function ( xhr ) {
  };


  THREE.Loader.Handlers.add( /\.dds$/i, new THREE.DDSLoader() );

  var loader = new THREE.OBJMTLLoader();
  var objPath = "assets/reformatted/5f6bb418ef684068b14121badd1a8c76.obj";
  var mtlPath = "assets/reformatted/5f6bb418ef684068b14121badd1a8c76.obj.mtl"
  loader.load( objPath, mtlPath, function ( object ) {
    // console.log( object )
    object.position.set( 0, 0, -2 );
    object.rotation.set( rad(-90), 0, 0, "XYZ");
    scene.add( object );

    var start = document.getElementById("start-button");
    start.onclick = function() {
      resetHeadOrigin();
      xlabsUpdateEnabled = true;
      document.getElementById("fullscreen").style.display = "none";
    } 
    start.style.display = "inline";

    document.getElementById("loading-text").style.display = "none";
  }, onProgress, onError );


  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  container.appendChild( renderer.domElement );

  // document.addEventListener( 'mousemove', onDocumentMouseMove, false );

  //

  window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

}


function onDocumentMouseMove( event ) {

  mouseX = ( event.clientX - windowHalfX );
  mouseY = ( event.clientY - windowHalfY );

  xlCamera.azmimuth = mouseX / 5;
  xlCamera.elevation = mouseY / 5;

  if( xlCamera.elevation < 0 ) xlCamera.elevation = 0;
  if( xlCamera.elevation > 90 ) xlCamera.elevation = 90;

}

//

function animate() {

  requestAnimationFrame( animate );
  update();
  render();
}

function render() {

  if( state == STATE_INIT_HEAD ) {
    paintInit();
  }

  renderer.render( scene, camera );

}

var lastUpdate = null;


function update() {

  if( !xlabsUpdateEnabled ) {
    return;
  }

  if( Errors.hasNoFace() ) {
    if( resetTimer.hasElapsed() ) {
      state = STATE_NO_FACE;
      xlCamera.azmimuthRate = 10;
      xlCamera.elevationRate = 0;
      xlCamera.elevation = 45;
      // console.log( "state: STATE_NO_FACE" );
    }
  }
  else { // has face
    resetTimer.reset();

    if( state == STATE_NO_FACE ) {
      // A face just came into view.
      stateTimer.setDuration( 6000 );
      stateTimer.reset();
      state = STATE_INIT_HEAD;
      xlCamera.azmimuthRate = 0;
      xlCamera.elevationRate = 0;
      // console.log( "state: STATE_INIT_HEAD" );
    }
    else if( state == STATE_INIT_HEAD ) {
      if( stateTimer.hasElapsed() ) {
        state = STATE_HEAD_CONTROL;
      // console.log( "state: STATE_HEAD_CONTROL" );
      }
    }
  }
  
  updateCameraPosition();
}

function updateCameraPosition() {

  if( lastUpdate === null ) {
    lastUpdate = Date.now();
  }

  var diffSec = (Date.now() - lastUpdate) / 1000.0;
  lastUpdate = Date.now();
  // console.log( "lastUpdate: " + lastUpdate );
  // console.log( "xlCamera.azmimuthRate * diffSec: " + xlCamera.azmimuthRate * diffSec );

  xlCamera.azmimuth += xlCamera.azmimuthRate * diffSec;

  if( xlCamera.azmimuthRate == 0 ) {
    xlCamera.elevation += xlCamera.elevationRate * diffSec;
    if( xlCamera.elevation < 10 ) xlCamera.elevation = 10;
    if( xlCamera.elevation > 90 ) xlCamera.elevation = 90;
  }


  // console.log( "xlCamera.azmimuth: " + xlCamera.azmimuth );

  var y = xlCamera.distance * Math.sin( rad(xlCamera.elevation) );
  d = xlCamera.distance * Math.cos( rad(xlCamera.elevation) );
  var x = d * Math.cos( rad(xlCamera.azmimuth) );
  var z = d * Math.sin( rad(xlCamera.azmimuth) );
 
  // camera.position.x += (x - camera.position.x) * 0.1
  // camera.position.y += (y - camera.position.y) * 0.1
  // camera.position.z += (z - camera.position.z) * 0.1
  camera.position.x = x
  camera.position.y = y
  camera.position.z = z

  camera.lookAt( scene.position );

}


function onXLabsReady() {
  console.log( "onXLabsReady" );
  window.onbeforeunload = function() {
      xLabs.setConfig( "system.mode", "off" );
  }

  xLabs.setConfig( "system.mode", "head" );
  xLabs.setConfig( "browser.canvas.paintHeadPose", "0" );

  init();
  animate();  
}


function findMedian(data, extract) {
  
  if( typeof extract === 'undefined' ) {
    extract = function(v) { return v; }
  }

  // extract the .values field and sort the resulting array
  var m = data.map(extract).sort(function(a, b) {
      return a - b;
  });

  var middle = Math.floor((m.length - 1) / 2); // NB: operator precedence
  if (m.length % 2) {
      return m[middle];
  } else {
      return (m[middle] + m[middle + 1]) / 2.0;
  }
}

var headOriginQueue = {x:[], y:[]};
var headOriginLength = 10;

function resetHeadOrigin() {
  // xlCamera = resetCamera();
  Head.reset();
  headOriginQueue = {x:[], y:[]};
}

function onXLabsUpdate() {

  if( !xlabsUpdateEnabled ) {
    return;
  }

  Errors.update();

  var x = parseFloat( xLabs.getConfig( "state.head.x" ) );
  var y = parseFloat( xLabs.getConfig( "state.head.y" ) );

  if( Head.xHeadOrigin === null ) {
    headOriginQueue.x.push( x );
    headOriginQueue.y.push( y );
    console.log( headOriginQueue.x.length );
    if( headOriginQueue.x.length >= headOriginLength ) {

      // console.log( headOriginQueue.x );
      // console.log( headOriginQueue.y );

      Head.xHeadOrigin = findMedian( headOriginQueue.x )
      Head.yHeadOrigin = findMedian( headOriginQueue.y )

      headOriginQueue = {x:[], y:[]};
      console.log( "head origin set at: " + Head.xHeadOrigin + ", " + Head.yHeadOrigin );
    }
  }

  if( Head.xHeadOrigin !== null ) {
    Head.update();
    var head = Head.get();

    var X_THRESH = 40;
    var X_GAIN = 1;
    var AZIMUTH_MAX_RATE = 30;

    var Y_THRESH = 40;
    var Y_GAIN = 1;
    var ELEVATION_MAX_RATE = 30;

    // Azimuth
    var dx = 0;
    

    if( head.x > X_THRESH ) {
      dx = head.x - X_THRESH;
    }
    else if( head.x < -X_THRESH ) {
      dx = head.x + X_THRESH;
    }

    var azmimuthRate = -dx * X_GAIN;

    if( azmimuthRate > AZIMUTH_MAX_RATE ) {
      azmimuthRate = AZIMUTH_MAX_RATE
    }
    else if( azmimuthRate < -AZIMUTH_MAX_RATE ) {
      azmimuthRate = -AZIMUTH_MAX_RATE
    }

    xlCamera.azmimuthRate = azmimuthRate;


    // Elevation
    var dy = 0;
    if( head.y > Y_THRESH ) {
      dy = head.y - Y_THRESH;
    }
    else if( head.y < -Y_THRESH ) {
      dy = head.y + Y_THRESH;
    }

    var elevationRate = -dy * Y_GAIN;

    if( elevationRate > ELEVATION_MAX_RATE ) {
      elevationRate = ELEVATION_MAX_RATE
    }
    else if( elevationRate < -ELEVATION_MAX_RATE ) {
      elevationRate = -ELEVATION_MAX_RATE
    }

    xlCamera.elevationRate = elevationRate;

    var e = document.getElementById( "headCircle" );
    var c = 80;
    e.setAttribute( "cx", c + dx );
    e.setAttribute( "cy", c + dy );

    // console.log( "azmimuthRate: " + azmimuthRate );
  }

}

xLabs.setup( onXLabsReady, onXLabsUpdate, null, "myToken" );

