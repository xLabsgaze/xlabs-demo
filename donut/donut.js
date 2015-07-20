
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
var Donut = {

  STATE_ERROR : 0,
  STATE_NONE : 1,
  STATE_COMFORT : 2,
  STATE_POSE : 3,
  STATE_INFO : 4,
  STATE_PIES : 5,
  STATE_DONE : 6,
  STATE_FADE : 7,
  STATE_GAZE : 8,
  STATES : 9,

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

    var state = Donut.state.getState();
    if( state == Donut.STATE_PIES ) {
      Pies.onMouseDown();  
    }
  },

  onMouseUp : function() {
    // detect mouse clicks in canvas "button"
    var state = Donut.state.getState();
    if( state == Donut.STATE_PIES ) {
      Pies.onMouseUp();  
    }
    else {
      //xLabs.setTruthEnabled( false ); // just in case we changed state while the mouse was down

      if( ( state == Donut.STATE_COMFORT ) ||
          ( state == Donut.STATE_POSE    ) ||
          ( state == Donut.STATE_INFO    ) ||
          ( state == Donut.STATE_DONE    ) ) {
        if( Paint.buttonMouseOver() ) {
          Donut.state.setState( state +1 ); // all the successor states are n+1 of the button confirms
        }
      }
    }

    xLabs.resetCalibrationTruth();
  },

  onMouseMove : function() {
    var state = Donut.state.getState();
    if( state == Donut.STATE_PIES ) {
      Pies.onMouseMove();
    }
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // State methods
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  updateState : function() {
    var state = Donut.state.getState();
    var stateNew = null;

    //console.log( "UI state="+state );

    if( ( state == Donut.STATE_NONE    ) ||
        ( state == Donut.STATE_COMFORT ) ||
        ( state == Donut.STATE_POSE    ) || // advanced on click, but button not shown until pose OK
        ( state == Donut.STATE_INFO    ) ||
        ( state == Donut.STATE_DONE    ) ) {
      return; // state updated on mouse event ONLY. No transitions based on 
    }

    // Gaze aborts when the face is lost.
    var timeElapsed = Donut.timer.hasElapsed();
    var hasError = Errors.hasErrorExcludingPose();
    var hasErrorExceptTracking = Errors.hasErrorExcludingTracking();
    var hasBadPose = Errors.hasBadPose();
    var hasNoFace = Errors.hasNoFace();

    if( state == Donut.STATE_GAZE ) {
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
        Donut.state.setState( Donut.STATE_NONE ); // always transition to this state
      }

      return;
    }

    // Only Pose and Pies states have an error mode.
    // In error mode, we stay until errors fixed + interval; otherwise we revert.
    // We can only go PIES->ERROR->PIES and PIES->POSE->PIES not ERROR->PIES or vice versa.

    if( state == Donut.STATE_ERROR ) {
      if( hasError ) {
        Donut.timer.reset(); // hold it in this state until after x seconds after fixing it
      }
      else { // no errors
        if( timeElapsed ) {
          Donut.state.setStateOld(); // go back to previous state, pose or pies
        }
      }

      return;
    }

    if( state == Donut.STATE_POSE ) {
      // -- fix it, then we show the button. advance on click
      if( hasErrorExcludingPose ) {
        Donut.timer.reset(); // hold it in this state until after x seconds after fixing it
        Donut.state.setState( Donut.STATE_ERROR ); // go back to previous state
      }
      else if( hasBadPose ) {
        Donut.timer.reset(); // hold it in this state until after x seconds after fixing it
      }
      else { // no errors
        if( timeElapsed ) {
          Paint.buttonShow();
        }
        else { // don't show button until timeout
          Paint.buttonHide();
        }
      }

      return;
    }

    // OK we only have PIES or FADE left.
    // What if we have an error, then goto error:
    if( state == Donut.STATE_PIES ) {
      if( Mouse.bMouseDown ) {
        // don't interrupt
      }
      else { // mouse not down
        if( hasError ) {
          Donut.timer.reset(); // hold it in this state until after x seconds after fixing it
          Donut.state.setState( Donut.STATE_ERROR ); // go back to previous state
        }

        if( Pies.allPiesVisited() ) {
          Donut.state.setState( Donut.STATE_DONE );
        }
      }

      return;
    }

    if( state == Donut.STATE_FADE ) {
      // dont care about errors, just get through this part
      if( timeElapsed ) {
        Donut.state.setState( Donut.STATE_GAZE ); // start gaze
      }

      return;
    }
  },

  onStateChanged : function() {
    // only happens on state change:
    var duration = Donut.DURATION_TRANSITION; // default
    var state = Donut.state.getState();
    //console.log( "State changed to: " + Donut.state.getState() );

         if( state == Donut.STATE_ERROR ) {
      Canvas.show();
    }
    else if( state == Donut.STATE_NONE ) {
      xLabs.setConfig( "system.mode", "off" );
      Canvas.hide();
      Graph.hide();
    }
    else if( state == Donut.STATE_COMFORT ) {
      xLabs.setConfig( "system.mode", "training" );
      Canvas.show();
    }
    else if( state == Donut.STATE_POSE ) {
      Canvas.show();
    }
    else if( state == Donut.STATE_INFO ) {
      Canvas.show();
    }
    else if( state == Donut.STATE_PIES ) {
      Canvas.show();
      if( Donut.state.getStateOld() != Donut.STATE_ERROR ) {
        Pies.reset();  
      }
    }
    else if( state == Donut.STATE_DONE ) {
      Canvas.show();
      xLabs.calibrate();
    }
    else if( state == Donut.STATE_FADE ) {
      Canvas.show();
    }
    else if( state == Donut.STATE_GAZE ) {
      Graph.show();
      duration = Donut.DURATION_GAZE;
      Canvas.show();
    }
 
    // reset timer:
    Donut.timer.setDuration( duration );
    Donut.timer.reset();
  },

  // Key events
  start : function() {
    Donut.state.setState( Donut.STATE_COMFORT );
  },

  paint : function() {
    Donut.update();
    Paint.paint();

    var state = Donut.state.getState();
    if( state == Donut.STATE_GAZE ) {
      Canvas.show();
      Canvas.clear();
      Gaze.update();
      //Grid.selectTileCheck( Gaze.xSmoothed, Gaze.ySmoothed );
      Graph.updateSelection( Gaze.xSmoothed, Gaze.ySmoothed );
      Gaze.paint();
    }
  },
  update : function() {
    Donut.updateState();
  }, 

  onCalibrationComplete : function() {
    //console.log( "calibration complete." );
    Donut.state.setState( Donut.STATE_DONE ); // all the successor states are n+1 of the button confirms
  },

  // xLabs API
  onXlabsReady : function() {
    xLabs.setConfig( "calibration.clear", "1" ); // this also clears the memory buffer
  },
  onXlabsState : function() {
    Errors.update();
    Head.update();
  },

  // Setup
  setup : function() {
    var colours = "../colours/colours_dark.json";
    Graph.setup( "graph", colours, false );

    Donut.timer = new Timer();
    Donut.timer.setDuration( 2000 );
    Donut.state = new State( Donut.STATES, Donut.STATE_NONE, Donut.onUiStateChanged );
    Donut.state.onStateChanged = Donut.onStateChanged;
    Canvas.paintCallback = Donut.paint;
    Mouse.mouseDownCallback = Donut.onMouseDown;
    Mouse.mouseUpCallback = Donut.onMouseUp;
    Mouse.mouseMoveCallback = Donut.onMouseMove;
    Pies.allPiesVisitedCallback = Donut.onCalibrationComplete;
    document.getElementById( "start" ).onclick = Donut.start;

    xLabs.setup( Donut.onXlabsReady, Donut.onXlabsState, null, "myToken" );
  }

};

Donut.setup();
