
///////////////////////////////////////////////////////////////////////////////
// Interactive calibration mode
// Design
// Has a number of steps, and a number of modes.
// Currently, there is a variable hasCalibrated that is reset on page load.
// We force all users to go through a stepped calib process once per page load. 
// This is tracked with calibrationStep. The step can be manually adjusted with <> keys, and 
// programmatically by the webpage (but the page shouldn't permanently alter the step). If the 
// persistent KV value of calibrationStep == 0 at all times, every restart will trigger a stepped
// calib process (desired behaviour). After this, process is successfully completed, the next step
// depends on calibrationMode. 
// In demo mode we are able to continue calibrating but we show off the accuracy detection and gaze
// to the user.
// In PIES mode we continue to calibrate as before, with the simple UI and not showing gaze.
// This will happen until the page decides to stop calibration.
// In FADE mode, the page will fade out.
//
// The other difference between demo and face/pies modes is that in demo mode, all the stuff is 
// turned on automatically, because there's no page controlling it.
///////////////////////////////////////////////////////////////////////////////
var Guide = {

  STATE_ERROR : 0,
  STATE_NONE : 1,
  STATE_COMFORT : 2,
  STATE_POSE : 3,
  STATE_TARGETS : 4,
  STATE_DONE : 5,
  STATE_FADE : 6,
  STATE_GAZE : 7,
  STATES : 8,

  DURATION_TRANSITION : 500, 
  DURATION_GAZE : 50000, 

  // Game
  state : null,
  timer : null,

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Mouse Listener
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  onMouseDown : function() {
    xLabs.resetCalibrationTruth(); // in case I need it

    var state = Guide.state.getState();
    if( state == Guide.STATE_TARGETS ) {
      //Targets.onMouseDown();  
    }
  },

  onMouseUp : function() {
    // detect mouse clicks in canvas "button"
    var state = Guide.state.getState();
    if( state == Guide.STATE_TARGETS ) {
      //Targets.onMouseUp();  
    }
    else {
      //xLabs.setTruthEnabled( false ); // just in case we changed state while the mouse was down
/*
      if( ( state == Guide.STATE_COMFORT ) ||
          ( state == Guide.STATE_POSE    ) ||
          ( state == Guide.STATE_DONE    ) ) {
        if( Paint.buttonMouseOver() ) {
          Guide.state.setState( state +1 ); // all the successor states are n+1 of the button confirms
        }
      }*/
    }

    xLabs.resetCalibrationTruth();
  },

  onMouseMove : function() {
    var state = Guide.state.getState();
    if( state == Guide.STATE_TARGETS ) {
      //Targets.onMouseMove();
    }
  },

  onButtonClicked : function() {
    var state = Guide.state.getState();
    Guide.state.setState( state +1 ); // all the successor states are n+1 of the button confirms
  },
  onTargetClicked : function() {
    Head.reset();
    //Targets.setNext();
    Points.setNext();
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // State methods
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  updateState : function() {
    var state = Guide.state.getState();
    var stateNew = null;

    //console.log( "UI state="+state );

    if( ( state == Guide.STATE_NONE    ) ||
        ( state == Guide.STATE_COMFORT ) ||
//        ( state == Guide.STATE_POSE    ) || // advanced on click, but button not shown until pose OK
        ( state == Guide.STATE_DONE    ) ) {
      return; // state updated on mouse event ONLY. No transitions based on 
    }

    // Gaze aborts when the face is lost.
    var timeElapsed = Guide.timer.hasElapsed();
    var hasError = Errors.hasErrorExcludingPose();
    var hasErrorExceptTracking = Errors.hasErrorExcludingTracking();
    var hasBadPose = Errors.hasBadPose();
    var hasNoFace = Errors.hasNoFace();

    if( state == Guide.STATE_GAZE ) {
      var stopGaze = false;
      if( hasNoFace ) {   
        stopGaze = true;
      }
      else if( timeElapsed ) { 
        stopGaze = true;
      }
      else if( hasBadPose ) {
        stopGaze = true;
      }

      if( stopGaze ) {  
        Guide.state.setState( Guide.STATE_NONE ); // always transition to this state
      }

      return;
    }

    // Only Pose and Targets states have an error mode.
    // In error mode, we stay until errors fixed + interval; otherwise we revert.
    // We can only go PIES->ERROR->PIES and PIES->POSE->PIES not ERROR->PIES or vice versa.

    if( state == Guide.STATE_ERROR ) {
      if( hasError ) {
        Guide.timer.reset(); // hold it in this state until after x seconds after fixing it
      }
      else { // no errors
        if( timeElapsed ) {
          Guide.state.setStateOld(); // go back to previous state, pose or pies
          Points.clear();
        }
      }

      return;
    }

    if( state == Guide.STATE_POSE ) {
      // -- fix it, then we show the button. advance on click
      // if( hasError ) {
      //   Guide.timer.reset(); // hold it in this state until after x seconds after fixing it
      //   Guide.state.setState( Guide.STATE_ERROR ); // go back to previous state
      // }
      // else
      // if( hasBadPose ) {
      if( !Graphics.faceCentred ) {
        Guide.timer.reset(); // hold it in this state until after x seconds after fixing it
        Graphics.showMessage( "Move the camera so your face is in the middle of the image.", null, false, "70%" );
        Graphics.showPose();
      }
      else { // no errors
        Graphics.showPose();

        if( timeElapsed ) {
          Graphics.showMessage( "Looks good!", "Next", false, "70%" );
        }
        else { // don't show button until timeout
          Graphics.hideMessage();
        }
      }

      return;
    }

    // OK we only have PIES or FADE left.
    // What if we have an error, then goto error:
    if( state == Guide.STATE_TARGETS ) {
      //if( Mouse.bMouseDown ) {
      //  // don't interrupt
      //}
      //else { // mouse not down
        if( hasError ) {
          Guide.timer.reset(); // hold it in this state until after x seconds after fixing it
          Guide.state.setState( Guide.STATE_ERROR ); // go back to previous state
          //TODO: consider requiring click to continue? 
          xLabs.resetCalibrationTruth(); // stop interpolation
        }
        else {
          Targets.update();
       
          if( Targets.complete() ) {
            Guide.state.setState( Guide.STATE_DONE );
            xLabs.resetCalibrationTruth(); // stop interpolation
          }
          else { // not complete
            if( Points.getIdx() != null ) {
              var xyHead = Targets.getScreenHead( Targets.get() );
              xLabs.updateCalibrationTruth( xyHead.x, xyHead.y ); // assume looking at mark under control
            }
            else {
              xLabs.resetCalibrationTruth(); // stop interpolation
            }
          }
        }
      //}

      return;
    }

    if( state == Guide.STATE_FADE ) {
      // dont care about errors, just get through this part
      if( timeElapsed ) {
        Guide.state.setState( Guide.STATE_GAZE ); // start gaze
      }

      return;
    }
  },

  aboutShow : function() {
    document.getElementById( "about" ).style.display = "block";
  },
  aboutHide : function() {
    document.getElementById( "about" ).style.display = "none";
  },

  onStateChanged : function() {
    // only happens on state change:
    var duration = Guide.DURATION_TRANSITION; // default
    var state = Guide.state.getState();
    //console.log( "State changed to: " + Guide.state.getState() );

    if( state == Guide.STATE_ERROR ) {
      Canvas.hide();
      Guide.aboutHide();
    }
    else if( state == Guide.STATE_NONE ) {
      xLabs.setConfig( "system.mode", "off" );
      Canvas.hide();
      Graph.hide();
      Guide.aboutShow();
    }
    else if( state == Guide.STATE_COMFORT ) {
      xLabs.setup( Guide.onXlabsReady, Guide.onXlabsState, null, "myToken" );
      Canvas.hide();
      Guide.aboutHide();
    }
    else if( state == Guide.STATE_POSE ) {
      Guide.aboutHide();
      Canvas.hide();
      Camera.show();
      Guide.aboutHide();
    }
    else if( state == Guide.STATE_TARGETS ) {
      Canvas.hide();
      Camera.hide();
      Guide.aboutHide();

      if( Guide.state.getStateOld() != Guide.STATE_ERROR ) {
        Targets.reset();  
      }
    }
    else if( state == Guide.STATE_DONE ) {
      Canvas.hide();
      xLabs.calibrate();
      Guide.aboutHide();
    }
    else if( state == Guide.STATE_FADE ) {
      Canvas.hide();
      Guide.aboutHide();
    }
    else if( state == Guide.STATE_GAZE ) {
      Graph.show();
      Canvas.show();
      duration = Guide.DURATION_GAZE;
      Guide.aboutHide();
    }
 
    // reset timer:
    Guide.timer.setDuration( duration );
    Guide.timer.reset();
  },

  // Key events
  start : function() {
    Guide.state.setState( Guide.STATE_COMFORT );
    xLabs.setConfig( "calibration.clear", "1" ); // this also clears the memory buffer
  },

  paint : function() {
    Guide.update();

    var state = Guide.state.getState();
//console.log( "state is "+state );

    if( state == Guide.STATE_GAZE ) {
      Canvas.clear();
      Gaze.update();
      //Grid.selectTileCheck( Gaze.xSmoothed, Gaze.ySmoothed );
      Graph.updateSelection( Gaze.xSmoothed, Gaze.ySmoothed );
      Gaze.paint();
    }
    else if( state == Guide.STATE_ERROR ) {
      Graphics.hideTarget();
      Graphics.hidePose();
      Graphics.showMessage( Errors.errorMessage, null, false );
    }
    else if( state == Guide.STATE_NONE ) {
      Graphics.hideTarget();
      Graphics.hidePose();
      Graphics.hideMessage();
    }
    else if( state == Guide.STATE_COMFORT ) {
      Graphics.hideTarget();
      Graphics.hidePose();
      Graphics.showMessage( "Take a minute to make yourself comfortable", "Next", false );
    }
    else if( state == Guide.STATE_POSE ) {
      Graphics.hideTarget();
      Graphics.showPose();
//      Graphics.showMessage( "pose", "Next", false );
    }
    else if( state == Guide.STATE_TARGETS ) {
      Graphics.hidePose();
      Graphics.hideMessage();
      Graphics.showTarget();
    }
    else if( state == Guide.STATE_DONE ) {
      Graphics.hideTarget();
      Graphics.showMessage( "All done. Demo coming up...", "Next", false );
    }
    else if( state == Guide.STATE_FADE ) {
      Graphics.hideTarget();
      Graphics.hideMessage();
    }
  },
  update : function() {
    Guide.updateState();
  }, 

  onCalibrationComplete : function() {
    //console.log( "calibration complete." );
    Guide.state.setState( Guide.STATE_DONE ); // all the successor states are n+1 of the button confirms
  },

  // xLabs API
  onXlabsReady : function() {
    xLabs.setConfig( "system.mode", "training" );
  },
  onXlabsState : function() {
    Errors.update();
    Head.update();
  },

  // Setup
  setup : function() {
    window.addEventListener( "beforeunload", function() {
        xLabs.setConfig( "system.mode", "off" );
    });

    var colours = "../colours/colours_dark.json";
    Graph.setup( "graph", colours, false );

    Guide.timer = new Timer();
    Guide.timer.setDuration( 2000 );
    Guide.state = new State( Guide.STATES, Guide.STATE_NONE, Guide.onUiStateChanged );
    Guide.state.onStateChanged = Guide.onStateChanged;

    Canvas.paintCallback = Guide.paint;

    Mouse.mouseDownCallback = Guide.onMouseDown;
    //Mouse.mouseUpCallback = Guide.onMouseUp;
    Mouse.mouseMoveCallback = Guide.onMouseMove;

    Targets.completedCallback = Guide.onCalibrationComplete;

    document.getElementById( "start" ).onclick = Guide.start;
    document.getElementById( "button" ).onclick = Guide.onButtonClicked;
    document.getElementById( "cCircle" ).addEventListener( "click", Guide.onTargetClicked );
    document.getElementById( "text" ).addEventListener( "click", Guide.onTargetClicked );

    // xLabs.setup( Guide.onXlabsReady, Guide.onXlabsState );
  }

};

Guide.setup();
