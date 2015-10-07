
window.xLabs = {

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Variables
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  config : null,
  callbackReady : null,
  callbackState : null,
  callbackIdPath : null,
  requestAccessIdx : 0,
  developerToken : null,

  XLABS_EXTENSION_ID : "licbccoefgmmbgipcgclfgpbicijnlga",

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Core API
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  isApiReady : function() {
    return document.documentElement.getAttribute( 'data-xlabs-extension-ready' ) == "1";
  },

  getConfig : function( path ) {
    var value = xLabs.getObjectProperty( xLabs.config, path );
    //console.log( "getConfig( "+path+" = "+ value + " )" );
    return value;
  },

  setConfig : function( path, value ) {
    window.postMessage( {
      target: "xLabs",
      token: xLabs.token, // may be null
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
    var ratio = parseFloat( xLabs.getConfig("browser.screen.devicePixelRatioWithoutZoom") );
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

    var xOffset = parseInt(xLabs.getConfig( "browser.document.offset.x" ));
    return screenX - window.screenX - xOffset;
  },

  scr2docY: function( screenY ) {
    if( !xLabs.documentOffsetReady() ) {
      throw "xLabs: Should not call scr2doc() unless mouse moved, i.e. browser.document.offset.ready == 1";
    }

    var yOffset = parseInt(xLabs.getConfig( "browser.document.offset.y" ));
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
    var xOffset = parseInt(xLabs.getConfig( "browser.document.offset.x" ));
    return documentX + window.screenX + xOffset;
  },

  doc2scrY: function( documentY ) {
    if( !xLabs.documentOffsetReady() ) {
      throw "xLabs: Should not call scr2doc() unless mouse moved, i.e. browser.document.offset.ready == 1";
    }
    var yOffset = parseInt(xLabs.getConfig( "browser.document.offset.y" ));
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

    xLabs.pageCheck()

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

  // Returns the version number of the extension, or null if extension not installed.
  extensionVersion : function() {
    return document.documentElement.getAttribute('data-xlabs-extension-version');
  },

  hasExtension : function() {
    return document.documentElement.getAttribute('data-xlabs-extension') ||
      document.documentElement.getAttribute('data-xlabs-extension-version') // to be compatible with < 2.5.2
  },

  isExtension : function() {
    return chrome.runtime.getManifest !== undefined
  },

  pageCheck : function() {
    console.log( "xlabs.js pageCheck() called")
    var message = {
      target : "xLabs",
      action: "request-access",
      token: xLabs.developerToken // may be null or undefined
    };

    // An extension is asking for permission, send a message directly to the background script.
    if( xLabs.isExtension() ) {
      chrome.runtime.sendMessage( xLabs.XLABS_EXTENSION_ID, message );
      console.log( "send message to xlabs background script with extension ID");
    }
    // From the a website
    else {
      window.postMessage( message, "*" );
      console.log( message );
      console.log( "posting message to content script.");
    }
  },

  setup : function( callbackReady, callbackState, callbackIdPath, developerToken ) {
    if( !xLabs.hasExtension() ) {
      alert("xLabs chrome extension is not installed");
      return;
    }

    xLabs.callbackReady = callbackReady;
    xLabs.callbackState = callbackState;
    xLabs.callbackIdPath = callbackIdPath;

    if( developerToken ) {
      xLabs.developerToken = developerToken
    }

    // If the API is already setup, then we can call the callback without needing
    // to listen to the ready event. But since it's meant to be a callback we
    // shall defer calling the callback in the event loop, which would be the expectation
    // when registering callbacks.
    if( xLabs.isApiReady() ) {
      setTimeout( function() {
        xLabs.onApiReady();
      }, 0 );
    }
    // Not ready yet, we can wait for the event.
    else {
      // add event listeners
      document.addEventListener( "xLabsApiReady", function() {
        xLabs.onApiReady();
      })
    }

    document.addEventListener( "xLabsApiState", function( event ) {
      xLabs.onApiState( event.detail );
    })

    document.addEventListener( "xLabsApiIdPath", function( event ) {
      xLabs.onApiIdPath( event.detail );
    })
  }

};

// Usage: xLabs.setup( myCallbackFnReady, myCallbackFnState );

