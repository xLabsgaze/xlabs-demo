
var Mouse = {

  // Callbacks
  mouseDownCallback : null,
  mouseMoveCallback : null,
  mouseUpCallback   : null,

  // Mouse movement logging
  xMouseScreen : 0, 
  yMouseScreen : 0,

  // Mouse press logging
  bMouseDown : false,

  xMouseScreenDown : 0,
  yMouseScreenDown : 0,
  tMouseScreenDown : 0,

  xMouseScreenUp : 0,
  yMouseScreenUp : 0,
  tMouseScreenUp : 0,

  // Functions
  addMouseListeners : function() {
    window.addEventListener( "mousemove", function( e ) {
      Mouse.onMouseMove( e );
    }, false );

    window.addEventListener( "mousedown",function(e) {
      Mouse.onMouseDown( e );
    }, false );

    window.addEventListener( "mouseup",function(e) {
      Mouse.onMouseUp( e );
    }, false );
  }, 

  getMouseScreenX : function( mouseEvent ) {
      if( xLabs.config == null ) {
        return mouseEvent.screenX;
      }

      if( xLabs.getConfig( "browser.mouse.absScreenCoordinates" ) == "1" ) {
        return mouseEvent.screenX;
      }
      else {
        return mouseEvent.screenX + window.screenX;
      }
  },

  getMouseScreenY : function( mouseEvent ) {
      if( xLabs.config == null ) {
        return mouseEvent.screenY;
      }

      //if( xLabsContent.config.browser.mouse.absScreenCoordinates == 1 ) {
      if( xLabs.getConfig( "browser.mouse.absScreenCoordinates" ) == "1" ) {
        return mouseEvent.screenY;
      }
      else {
        return mouseEvent.screenY + window.screenY;
      }
  },

  onMouseMove : function( e ) {
    // Save the current mouse position
    Mouse.xMouseScreen = Mouse.getMouseScreenX( e );
    Mouse.yMouseScreen = Mouse.getMouseScreenY( e );
    
    if( Mouse.mouseMoveCallback != null ) {
      Mouse.mouseMoveCallback();
    }
  },

  onMouseDown : function( e ) {
    Mouse.bMouseDown = true;

    var xScreen = Mouse.getMouseScreenX( e );
    var yScreen = Mouse.getMouseScreenY( e );

    Mouse.xMouseScreenDown = xScreen;
    Mouse.yMouseScreenDown = yScreen;
    Mouse.tMouseScreenDown = xLabs.getTimestamp();

    if( Mouse.mouseDownCallback != null ) {
      Mouse.mouseDownCallback();
    }
  },

  onMouseUp : function( e ) {
    Mouse.bMouseDown = false;

    var xScreen = Mouse.getMouseScreenX( e );
    var yScreen = Mouse.getMouseScreenY( e );

    Mouse.xMouseScreenUp = xScreen;
    Mouse.yMouseScreenUp = yScreen;
    Mouse.tMouseScreenUp = xLabs.getTimestamp();

    if( Mouse.mouseUpCallback != null ) {
      Mouse.mouseUpCallback();
    }
  },

  setup : function() {
    Mouse.addMouseListeners();
  }

};

Mouse.setup();
