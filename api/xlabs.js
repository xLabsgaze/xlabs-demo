
var xLabs = {

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Variables
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  config : null,
  callbackReady : null,
  callbackState : null,
  callbackIdPath : null,
  apiReady : false,

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Core API
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  isApiReady : function() {
    return !!xLabs.apiReady;
  },

  getConfig : function( path ) {
    var value = xLabs.getObjectProperty( xLabs.config, path );
    //console.log( "getConfig( "+path+" = "+ value + " )" );
    return value;
  },

  setConfig : function( path, value ) {
    window.postMessage( { 
      target: "xLabs", 
      config: { 
        path: path, 
        value: value
      } 
    }, "*" );
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // JSON
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  getObjectProperty : function( object, path ) {
    if( ( object == undefined ) || ( object == null ) ) {
      return "";
    }
    //console.log( "Uril util"+path );
    var parts = path.split('.'),
        last = parts.pop(),
        l = parts.length,
        i = 1,
        current = parts[ 0 ];

    while( ( object = object[ current ] ) && i < l ) {
      current = parts[ i ];
      //console.log( "Util object: "+JSON.stringify( object ) );
      i++;
    }

    if( object ) {
      //console.log( "Util result: "+object[ last ] );
      return object[ last ];
    }
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Calibration
  // Truth - data for gaze calibration. Basically you need to tell xLabs where the person is looking
  // at a particular time. 
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  t1 : 0,

  resetCalibrationTruth : function() {
    xLabs.t1 = 0;
  },

  updateCalibrationTruth : function( xScreen, yScreen ) {
    var t1 = xLabs.t1;
    var t2 = xLabs.getTimestamp();

    if( t1 <= 0 ) { // none set
      t1 = t2;
      t2 = t2 +1; // ensure duration at least 1 and positive
    }

    xLabs.addCalibrationTruth( t1, t2, xScreen, yScreen );

    xLabs.t1 = t2; // change the timestamp
  },

  addCalibrationTruth : function( t1, t2, xScreen, yScreen ) {
    // Defines ordering of values
    // t1,t2,xs,ys
    // For truth, also used for clicks
    var csv = t1 + "," + t2 + "," + parseInt( xScreen  ) + "," + parseInt( yScreen );
    //console.log( "xLabs truth: "+csv );
    xLabs.setConfig( "truth.append", csv );    
  },

  calibrate : function( id ) {
    var request = "3p";
    if( id ) {
      request = id;
    }
    
    xLabs.setConfig( "calibration.request", request );    
    console.log( "xLabs: Calibrating..." );
  },

  calibrationClear : function() {
    xLabs.setConfig( "calibration.clear", request );    
    console.log( "xLabs: Clearing calibration..." );
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Time - in a compatible format.
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  getTimestamp : function() {
    // unified function to get suitable timestamps
    var dateTime = new Date();
    var timestamp = dateTime.getTime();
    return timestamp;
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Resolution
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  getDpi : function() {
    var dppx = window.devicePixelRatio ||
      (    window.matchMedia 
        && window.matchMedia( "(min-resolution: 2dppx), (-webkit-min-device-pixel-ratio: 1.5),(-moz-min-device-pixel-ratio: 1.5),(min-device-pixel-ratio: 1.5)" ).matches? 2 : 1 )
      || 1;

    var w = ( screen.width  * dppx );
    var h = ( screen.height * dppx );
    return this.calcDpi( w, h, 13.3, 'd' );
  },

  calcDpi : function( w, h, d, opt ) {
    // Calculate PPI/DPI
    // Source: http://dpi.lv/
    w>0 || (w=1);
    h>0 || (h=1);
    opt || (opt='d');
    var dpi = (opt=='d' ? Math.sqrt(w*w + h*h) : opt=='w' ? w : h) / d;
    return dpi>0 ? Math.round(dpi) : 0;
  }, 

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Coordinate conversion
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  devicePixelRatio : function() {
    var ratio = xLabs.getConfig("browser.screen.devicePixelRatioWithoutZoom")
    if( !ratio ) {
      return null
    }
    var ratio = parseInt( ratio );
    if( ratio === 0 ) {
      return null;
    }
    return window.devicePixelRatio / ratio;
  },


  documentOffset : function() {
    if( !xLabs.documentOffsetReady() ) {
      throw "xLabs: Should not call scr2doc() unless mouse moved, i.e. browser.document.offset.ready == 1";
    }
    var x = parseInt( xLabs.getConfig( "browser.document.offset.x" ) );
    var y = parseInt( xLabs.getConfig( "browser.document.offset.y" ) );
    return { x: x, y: y };
  },

  documentOffsetReady : function() {
    var ready = xLabs.getConfig( "browser.document.offset.ready" );
    if( ready.localeCompare( "1" ) != 0 ) {
      return false;
    }
    return true;
  },

  scr2docX: function( screenX ) {
    if( !xLabs.documentOffsetReady() ) {
      throw "xLabs: Should not call scr2doc() unless mouse moved, i.e. browser.document.offset.ready == 1";
    }

    var xOffset = xLabs.getConfig( "browser.document.offset.x" );
    return screenX - window.screenX - xOffset;
  },

  scr2docY: function( screenY ) {
    if( !xLabs.documentOffsetReady() ) {
      throw "xLabs: Should not call scr2doc() unless mouse moved, i.e. browser.document.offset.ready == 1";
    }

    var yOffset = xLabs.getConfig( "browser.document.offset.y" );
    return screenY - window.screenY - yOffset;
  },

  scr2doc: function( screenX, screenY ) {
    return {
      x: xLabs.scr2docX( screenX ),
      y: xLabs.scr2docY( screenY )
    }
  },

  doc2scrX: function( documentX ) {
    if( !xLabs.documentOffsetReady() ) {
      throw "xLabs: Should not call scr2doc() unless mouse moved, i.e. browser.document.offset.ready == 1";
    }
    var xOffset = xLabs.getConfig( "browser.document.offset.x" );
    return documentX + window.screenX + xOffset;
  },

  doc2scrY: function( documentY ) {
    if( !xLabs.documentOffsetReady() ) {
      throw "xLabs: Should not call scr2doc() unless mouse moved, i.e. browser.document.offset.ready == 1";
    }
    var yOffset = xLabs.getConfig( "browser.document.offset.y" );
    return documentY + window.screenY + yOffset;
  },

  doc2scr: function( documentX, documentY ) {
    return {
      x: xLabs.doc2scrX( documentX ),
      y: xLabs.doc2scrY( documentY )
    }
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Setup
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  onApiReady : function() {
    xLabs.apiReady = true;
    if( xLabs.callbackReady != null ) {
      xLabs.callbackReady();
    }
  },

  onApiState : function( config ) {
    xLabs.config = config;
    if( xLabs.callbackState != null ) {
      xLabs.callbackState();
    }
  },

  onApiIdPath : function( detail ) {
    if( xLabs.callbackIdPath != null ) {
      xLabs.callbackIdPath( detail.id, detail.path );
    }
  },

  extensionInstalled : function(withAlert) {
    var ok = !!document.getElementById("xLabs-chrome-extension-installed");
    if( !ok ) {
      if( withAlert ) {
        alert("xLabs chrome extension is not installed");
      }
    }
    return ok;
  },

  setup : function( callbackReady, callbackState, callbackIdPath ) {
    xLabs.callbackReady = callbackReady;
    xLabs.callbackState = callbackState;
    xLabs.callbackIdPath = callbackIdPath;

    if( !!xLabs.apiReady ) {
      xLabs.callbackReady();
    }
  }

};


// add event listeners
document.addEventListener( "xLabsApiReady", function() {
  xLabs.onApiReady();
} );

document.addEventListener( "xLabsApiState", function( event ) {
  xLabs.onApiState( event.detail );
} );

document.addEventListener( "xLabsApiIdPath", function( event ) {
  xLabs.onApiIdPath( event.detail );
} );

xLabs.extensionInstalled(true);

// Usage: xLabs.setup( myCallbackFnReady, myCallbackFnState );

