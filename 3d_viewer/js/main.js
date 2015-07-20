

var container, stats;

var camera, scene, renderer;

var targetCameraX = 0;
var targetCameraY = 0;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

// var canvasWidth  = 800;
// var canvasHeight = 500;

var canvasWidth  = 500;
var canvasHeight = 500;

var viewportShiftScale = 3.55;
var headPositionScale = 40;

var jitterCnt = 0;
var jitterCntInc = 1;


function init() {

  container = document.getElementById( "viewport" );
  // document.body.appendChild( container );

  // scene

  scene = new THREE.Scene();

  var ambient = new THREE.AmbientLight( 0x101010 );
  scene.add( ambient );

  // scene.fog = new THREE.FogExp2( 0xaaaaaa, 0.006 );
  scene.fog = new THREE.FogExp2( 0x000000, 0.006 );


  // var directionalLight = new THREE.DirectionalLight( 0xffeedd );
  // directionalLight.position.set( 0, 0, 1 ).normalize();
  // scene.add( directionalLight );

  (function(){
    // var light = new THREE.PointLight( 0xffffff, 1, 0 );
    var light = new THREE.PointLight( 0xe0e0ff, 1, 0 );
    light.position.set( +30, +30, 100 );
    scene.add( light );
  })();
  (function(){
    var light = new THREE.PointLight( 0x202020, 1, 0 );
    light.position.set( +30, +30, -30 );
    scene.add( light );
  })();
  (function(){
    var light = new THREE.PointLight( 0x808020, 1, 0 );
    light.position.set( -30, +30, -30 );
    scene.add( light );
  })();

  function wallMaterial( color ) {
    if( typeof color === 'undefined' ) {
      color = 0x808080;
    }
    // return new THREE.MeshLambertMaterial( {color: 0x808080 } );
    return new THREE.MeshPhongMaterial( {color: color, specular: 0x808080, shininess:0, metal:false } );
    // return new THREE.MeshDepthMaterial();
  }

  function stickMaterial( color ) {
    if( typeof color === 'undefined' ) {
      color = 0xff8000;
    }
    // return new THREE.MeshLambertMaterial( {color: 0x808080 } );
    return new THREE.MeshPhongMaterial( {color: color, specular: 0x808080, shininess:0, metal:false } );
    // return new THREE.MeshDepthMaterial();
  }

  function shinyMaterial( color ) {
    if( typeof color === 'undefined' ) {
      color = 0x808080;
    }
    // return new THREE.MeshLambertMaterial( {color: 0x808080 } );
    return new THREE.MeshPhongMaterial( {color: color, specular: 0x808080, shininess:1000, metal:true } );
    // return new THREE.MeshDepthMaterial();
  }

  function flatMaterial( color ) {
    if( typeof color === 'undefined' ) {
      color = 0x808080;
    }
    return new THREE.MeshBasicMaterial( {color: color} );
  }


  // (function(){
  //   var geometry = new THREE.PlaneGeometry( 100, 100 );
  //   var obj = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( {color: 0xb0b000 } ) );
  //   obj.position.set( 0, 0, 0 );
  //   scene.add( obj );
  // })();

  // floor
  (function(){
    var geometry = new THREE.BoxGeometry( 100, 100, 10 );
    var mat = wallMaterial();
    mat.color = 0;
    var obj = new THREE.Mesh( geometry, mat );
    obj.position.set( 0, 0, -100 );
    scene.add( obj );
  })();


  // walls
  (function(){
    var geometry = new THREE.BoxGeometry( 1000, 1000, 100 );
    var obj = new THREE.Mesh( geometry, wallMaterial() );
    obj.position.set( -500-50, 0, -50 );
    scene.add( obj );
  })();

  (function(){
    var geometry = new THREE.BoxGeometry( 1000, 1000, 100 );
    var obj = new THREE.Mesh( geometry, wallMaterial() );
    obj.position.set( +500+50, 0, -50 );
    scene.add( obj );
  })();

  (function(){
    var geometry = new THREE.BoxGeometry( 1000, 1000, 100 );
    var obj = new THREE.Mesh( geometry, wallMaterial() );
    obj.position.set( 0, -500-50, -50 );
    scene.add( obj );
  })();

  (function(){
    var geometry = new THREE.BoxGeometry( 1000, 1000, 100 );
    var obj = new THREE.Mesh( geometry, wallMaterial() );
    obj.position.set( 0, +500+50, -50 );
    scene.add( obj );
  })();

  // bevel
  var size = 115;
  var bevelColor = 0xffffd0;
  (function(){
    var geometry = new THREE.BoxGeometry( 5, size, 100 );
    var obj = new THREE.Mesh( geometry, wallMaterial(bevelColor) );
    obj.position.set( -55, 0, -45 );
    scene.add( obj );
  })();
  (function(){
    var geometry = new THREE.BoxGeometry( 5, size, 100 );
    var obj = new THREE.Mesh( geometry, wallMaterial(bevelColor) );
    obj.position.set( +55, 0, -45 );
    scene.add( obj );
  })();
  (function(){
    var geometry = new THREE.BoxGeometry( size, 5, 100 );
    var obj = new THREE.Mesh( geometry, wallMaterial(bevelColor) );
    obj.position.set( 0, -55, -45 );
    scene.add( obj );
  })();
  (function(){
    var geometry = new THREE.BoxGeometry( size, 5, 100 );
    var obj = new THREE.Mesh( geometry, wallMaterial(bevelColor) );
    obj.position.set( 0, +55, -45 );
    scene.add( obj );
  })();


  // sticks out
  (function(){
    var geometry = new THREE.BoxGeometry( 5, 5, 200 );
    var obj = new THREE.Mesh( geometry, stickMaterial() );
    obj.position.set( -10, -10, -50 );    
    scene.add( obj );
  })();

  (function(){ // ball at the end
    var geometry = new THREE.SphereGeometry( 5, 20, 20 );
    var obj = new THREE.Mesh( geometry, shinyMaterial() );
    obj.position.set( -10, -10, 50 );    
    scene.add( obj );
  })();
  // (function(){ // box at the end
  //   var geometry = new THREE.BoxGeometry( 7, 7, 7 );
  //   var obj = new THREE.Mesh( geometry, shinyMaterial() );
  //   obj.position.set( -10, -10, 50 );    
  //   scene.add( obj );
  // })();

  (function(){
    var geometry = new THREE.BoxGeometry( 5, 5, 80 );
    var obj = new THREE.Mesh( geometry, stickMaterial() );
    obj.position.set( +30, 10, -50 );
    scene.add( obj );
  })();

  (function(){
    var geometry = new THREE.BoxGeometry( 5, 5, 70 );
    var obj = new THREE.Mesh( geometry, stickMaterial() );
    obj.position.set( -10, +30, -50 );
    scene.add( obj );
  })();

  (function(){
    var geometry = new THREE.BoxGeometry( 5, 5, 50 );
    var obj = new THREE.Mesh( geometry, stickMaterial() );
    obj.position.set( -30, +20, -50 );
    scene.add( obj );
  })();

  (function(){
    var geometry = new THREE.BoxGeometry( 5, 5, 30 );
    var obj = new THREE.Mesh( geometry, stickMaterial() );
    obj.position.set( +30, -35, -70 );
    scene.add( obj );
  })();

  (function(){
    var geometry = new THREE.BoxGeometry( 5, 5, 70 );
    var obj = new THREE.Mesh( geometry, stickMaterial() );
    obj.position.set( +5, -25, -50 );
    scene.add( obj );
  })();


  (function(){
    var geometry = new THREE.BoxGeometry( 5, 5, 20 );
    var obj = new THREE.Mesh( geometry, stickMaterial() );
    obj.position.set( -30, -35, -70 );
    scene.add( obj );
  })();

  (function(){
    var geometry = new THREE.BoxGeometry( 5, 300, 6 );
    var obj = new THREE.Mesh( geometry, wallMaterial() );
    obj.position.set( 25, 0, -3 );
    scene.add( obj );
  })();

  (function(){
    var geometry = new THREE.BoxGeometry( 5, 300, 6 );
    var obj = new THREE.Mesh( geometry, wallMaterial() );
    obj.position.set( -25, 0, -3 );
    scene.add( obj );
  })();

  // White bars
  // (function(){
  //   var geometry = new THREE.BoxGeometry( 5, 300, 2 );
  //   // var geometry = new THREE.PlaneGeometry( 5, 300, 10 );
  //   var obj = new THREE.Mesh( geometry, flatMaterial( 0xffffff ) );
  //   obj.position.set( 25, 0, 0 );
  //   scene.add( obj );
  // })();

  // (function(){
  //   var geometry = new THREE.BoxGeometry( 5, 300, 2 );
  //   // var geometry = new THREE.PlaneGeometry( 5, 300, 10 );
  //   var obj = new THREE.Mesh( geometry, flatMaterial( 0xffffff ) );
  //   obj.position.set( -25, 0, 0 );
  //   scene.add( obj );
  // })();


  // floating
  // (function(){
  //   var geometry = new THREE.BoxGeometry( 8, 40, 5 );
  //   var obj = new THREE.Mesh( geometry, wallMaterial() );
  //   obj.position.set( +0, -20, 0 );
  //   scene.add( obj );
  // })();
  // (function(){
  //   var geometry = new THREE.BoxGeometry( 50, 6, 5 );
  //   var obj = new THREE.Mesh( geometry, wallMaterial(0xb06060) );
  //   obj.position.set( -10, -20, -30 );
  //   scene.add( obj );
  // })();


  // model
  var onProgress = function ( xhr ) {
    if ( xhr.lengthComputable ) {
      var percentComplete = xhr.loaded / xhr.total * 100;
      console.log( Math.round(percentComplete, 2) + '% downloaded' );
    }
  };

  var onError = function ( xhr ) {
  };


  // THREE.Loader.Handlers.add( /\.dds$/i, new THREE.DDSLoader() );

  // var loader = new THREE.OBJMTLLoader();
  // loader.load( 'data/model/male02/male02.obj', 'data/model/male02/male02_dds.mtl', function ( object ) {

  //   object.position.y = - 80;
  //   scene.add( object );

  // }, onProgress, onError );



  // camera

  // camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
  camera = new THREE.PerspectiveCamera( 45, canvasWidth / canvasHeight, 50, 300 );
  camera.position.x = 0;
  camera.position.y = 0;
  camera.position.z = 170;
  
  camera.lookAt( scene.position );

  // renderer

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerHeight*0.9, window.innerHeight*0.9 );
  
  // renderer.setClearColor( 0xa0a0a0, 1 );
  // renderer.setViewport( 300, 0, window.innerWidth/3, window.innerHeight/3 )
  // camera.setViewOffset( fullWidth, fullHeight, w * 1, h * 0, w, h );

  container.appendChild( renderer.domElement );

  // document.addEventListener( 'mousemove', onDocumentMouseMove, false );

  //

  // window.addEventListener( 'resize', onWindowResize, false );
  (function(){
    var input = document.getElementById("viewportShiftScale");
    input.value = "" + viewportShiftScale;
    input.onkeydown = function( event ) {
      if( event.keyCode == 13 ) {
        viewportShiftScale = parseFloat( input.value );
        console.log( "viewportShiftScale: " + viewportShiftScale );
      }
    }
  })();

  (function(){
    var input = document.getElementById("headPositionScale");
    input.value = "" + headPositionScale;
    input.onkeydown = function( event ) {
      if( event.keyCode == 13 ) {
        headPositionScale = parseFloat( input.value );
        console.log( "headPositionScale: " + headPositionScale );
      }
    }
  })();

  // setup xlabs
  xLabs.setup( onXLabsReady, onXLabsUpdate, null, "myToken" );
}

// function onWindowResize() {

//   windowHalfX = window.innerWidth / 2;
//   windowHalfY = window.innerHeight / 2;

//   camera.aspect = window.innerWidth / window.innerHeight;
//   camera.updateProjectionMatrix();

//   renderer.setSize( window.innerWidth, window.innerHeight );

// }

function onDocumentMouseMove( event ) {

  targetCameraX = ( event.clientX - windowHalfX ) / 5;
  targetCameraY = ( event.clientY - windowHalfY ) / 5;

}

//

function animate() {

  requestAnimationFrame( animate );
  render();

}

function render() {

  function rate( delta ) {
    var r = Math.abs(delta)/100;
    r = Math.max( 0.0, Math.min( 1.0, r ) );
    // console.log( r );
    return r;
  }

  cameraX = camera.position.x + ( targetCameraX - camera.position.x ) * rate(targetCameraX - camera.position.x);
  cameraY = camera.position.y + ( targetCameraY - camera.position.y ) * rate(targetCameraY - camera.position.y);

  // cameraX += jitterCnt * 1.5;

  // jitterCnt += jitterCntInc;
  
  // if( jitterCnt > 1 ) {
  //   jitterCntInc = -1
  // }  
  // else if( jitterCnt < 0 ) {
  //   jitterCntInc = +1
  // }  

  camera.position.x = cameraX;
  camera.position.y = cameraY;


  // var deltaX = (  targetCameraX - camera.position.x ) * 0.04;
  // var deltaY = ( -targetCameraY - camera.position.y ) * 0.04;
  // var deltaX = targetCameraX - camera.position.x;
  // var deltaY = targetCameraY - camera.position.y;

  // camera.position.x += deltaX;
  // camera.position.y += deltaY;

  // thresholded so we don't get jitter
  // TODO use a kalman filter to do this
  // if( deltaX > 5 ) camera.position.x += deltaX;
  // if( deltaY > 5 ) camera.position.y += deltaY;



  // console.log( "camera.position: " + camera.position.x + ", " + camera.position.y )
  // camera.lookAt( scene.position );
  // camera.setViewOffset( canvasWidth, canvasHeight, 0, 0, canvasWidth, canvasHeight );

  var scale = 3.8;
  camera.setViewOffset( 
    canvasWidth, 
    canvasHeight,
    -camera.position.x*viewportShiftScale,
     camera.position.y*viewportShiftScale,
    canvasWidth,
    canvasHeight );

  renderer.render( scene, camera );

  // console.log( "viewportShiftScale:" + viewportShiftScale );

}

function onXLabsReady() {
  window.onbeforeunload = function() {
      xLabs.setConfig( "system.mode", "off" );
  }

  xLabs.setConfig( "system.mode", "head" );
  xLabs.setConfig( "browser.canvas.paintHeadPose", "0" );
}

function onXLabsUpdate() {
  var x = parseFloat( xLabs.getConfig( "state.head.x" ) );
  var y = parseFloat( xLabs.getConfig( "state.head.y" ) );

  y += 0.7;

  // console.log( "y: " + y );
  // console.log( "headPositionScale:" + headPositionScale );

  targetCameraX = -x * headPositionScale;
  targetCameraY = -y * headPositionScale;
}

init();
animate();

document.getElementById("fullscreen-button").onclick = function(){
  document.documentElement.webkitRequestFullscreen();
  document.getElementById("fullscreen").style.display = "none";
  document.getElementById("main").style.display = "block";
}






