var Viewing = {

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // CONSTANTS
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Possible outcomes to be detected by other code:
  RESULT_NONE : "none",
  RESULT_CANCELLED : "Cancelled",
  RESULT_ABORTED : "Aborted", // 
  RESULT_TRUNCATED : "Truncated",  // viewing finished early due to an error
  RESULT_COMPLETE : "Complete",

  ACCURACY_MIN_PC : 80,

  // Possible states of the process
  STATE_ERROR : 0,
  STATE_NONE : 1,
  STATE_COMFORT : 2,
  STATE_POSE : 3,
  STATE_TARGETS : 4,
  STATE_REMIND : 5,
  STATE_FADE : 6,
  STATE_VIEW : 7,
  STATE_TEST : 8,
  STATE_POST : 9,
  STATES : 10,

  USE_CROSSHAIRS : true,
  USE_HEAD_INTERACTION : false,


  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // VARIABLES
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // detecting persistent or enduring error handling
  errorStateMaxDebugCount : 2,     // how many times we can entered the error state [from the targets state]
  errorStateMaxCount : 3,     // how many times we can entered the error state [from the targets state]
  errorStateMaxDuration : 5 * 1000,  // how long we have been in the error state. If too long, we start treating it as a persistent or enduring error
  errorStateTimer : null,
  errorStateTimerElapsed : false,     // how many times we have entered the error state [from the targets state]
  errorStateCount : 0,     // how many times we have entered the error state [from the targets state]
  errorStateDebugCount : 0,     // how many times we have entered the error state [from the targets state]
  errorStateDebug : false,     // when it is shown

  // managing state of system
  interval : 60, 
  duration : 10000, 
  transitionTime : 500,
  xLabsLogCount : 0,
  fullScreenStarted : false,

  // Objects used:
  state : null,
  timer : null,

  // results data
  settings : "",
  result : "",

  scrolllog : "",    
  mouselog : "",    

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Mouse Listener
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  onMouseDown : function() {
    xLabs.resetCalibrationTruth(); // in case I need it
  },

  onMouseUp : function() {
    xLabs.resetCalibrationTruth();
  },

  onMouseMove : function() {
    Viewing.logMouseMoveEvent();
  },

  onButtonClicked : function() {
    var state = Viewing.state.getState();

    if( ( state == Viewing.STATE_ERROR ) && Viewing.hasPersistentError() ) {
      Viewing.resetPersistentError();
    }
    else {     
      Viewing.state.setState( state +1 ); // all the successor states are n+1 of the button confirms
    }
  },
  onTargetClicked : function() {
    Head.reset();

    var state = Viewing.state.getState();

    if( state == Viewing.STATE_TARGETS ) {
      Points.setNext();
    }
    else if( state == Viewing.STATE_TEST ) {
      Test.addScore(); // log the score from the previous target, if any
      Targets.setNext();
      var xyTarget = Targets.getScreen( Targets.idxTarget );
      Test.setTarget( xyTarget.x, xyTarget.y );
    }
  },
  onClickTargetClicked : function() {
    var state = Viewing.state.getState();
    if( state == Viewing.STATE_TARGETS ) {
      Clicks.onClick();
    }
  },
  onClickTargetMouseOver : function() {
    Clicks.onMouseOver();
  },
  onClickTargetMouseOut : function() {
    Clicks.onMouseOut();
  },

  setTimeout : function() {
    setTimeout( Viewing.update, Viewing.interval );
  },

  // call this function on fixing any persistent problems
  resetPersistentError : function() {
    //console.log( "reset cumulative error tracking" );
    if( Viewing.errorStateTimer == null ) {
      Viewing.errorStateTimer = new Timer();
      Viewing.errorStateTimer.setDuration( Viewing.errorStateMaxDuration );
    }
       
    Viewing.errorStateTimer.reset(); // how long have been in error state
    Viewing.errorStateTimerElapsed = false;
    Viewing.errorStateCount = 0;
  },

  // call this function on entering the error state.
  onPersistentError : function() {
    Viewing.errorStateCount = Viewing.errorStateCount +1;
    Viewing.errorStateTimer.reset(); // how long have been in error state
  },

  enablePersistentError : function( enable ) {
    if( Viewing.errorStateDebug == enable ) {
      return; // lazy
    }    
    Viewing.errorStateDebug = enable;
    console.log( "? debug view count="+Viewing.errorStateDebugCount + " threshold ="+Viewing.errorStateMaxDebugCount );

    if( Viewing.errorStateDebug ) {
      // on entering debug state, reset the calibration process to the start (non interactive only)
      if( !Viewing.USE_HEAD_INTERACTION ) {
        Clicks.reset();
      }
      Viewing.errorStateDebugCount = Viewing.errorStateDebugCount +1; 
      if( Viewing.errorStateDebugCount > Viewing.errorStateMaxDebugCount ) {
        // abort the session.
        console.log( "  debug view count="+Viewing.errorStateDebugCount + " threshold ="+Viewing.errorStateMaxDebugCount );
        Viewing.result = Viewing.RESULT_ABORTED; // will persist over the other fullscreen exit result value
	FullScreen.stop();
      }
      else {
        Camera.show(); // show the UI for dealing with persistent errors.
      }
    }
    else { // turn off
      Camera.hide(); // show the UI for dealing with persistent errors.
    }
  },

  // call this function while in the error state
  updatePersistentError : function() {
    //var state = Viewing.state.getState();
    //if( state == Viewing.STATE_ERROR ) {
      if( Viewing.errorStateTimer.hasElapsed() ) {
        Viewing.errorStateTimerElapsed = true;
      }
    //}
  },

  // errorState > x seconds or in errorState > y times
  hasPersistentError : function() {
//console.log( "errrStateCount = "+Viewing.errorStateCount );
//console.log( "errrStateTimerElapsed? = "+Viewing.errorStateTimerElapsed );
    var enable = false;
    if( Viewing.errorStateCount >= Viewing.errorStateMaxCount ) {
      enable = true;
    }
    if( Viewing.errorStateTimerElapsed ) {
      enable = true;
    }
//console.log( "errrState not persistent" );
    Viewing.enablePersistentError( enable );
    return enable;
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // State methods
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  updateState : function() {
    var state = Viewing.state.getState();
    var stateNew = null;

    //console.log( "UI state="+state );

    if( ( state == Viewing.STATE_NONE    ) ||
        ( state == Viewing.STATE_COMFORT ) ||
        ( state == Viewing.STATE_REMIND    ) ) {
      return; // state updated on mouse event ONLY. No transitions based on 
    }

    // Gaze aborts when the face is lost.
    var timeElapsed = Viewing.timer.hasElapsed();
    //var hasErrorExceptPose = Errors.hasErrorExcludingPose();
    //var hasErrorExceptTracking = Errors.hasErrorExcludingTracking();
    var hasError    = Errors.hasError();
    var hasNoFace   = Errors.hasNoFace();
    var hasBadPose  = Errors.hasBadPose();
    var hasBadTrack = Errors.hasBadTrack();

    if( state == Viewing.STATE_VIEW ) {
      var stopViewing = false;
      var aborted = false;
      if( hasNoFace ) {   
        console.log( "stop viewing because no face." );
        stopViewing = true;
        aborted = true;
      }
      else if( timeElapsed ) { 
        console.log( "stop viewing because time elapsed." );
        stopViewing = true;
      }
      else if( hasBadPose ) {
// Dave: I've removed this, it's too harsh.
//        console.log( "stop viewing because bad pose." );
//        stopViewing = true;
//        aborted = true;
      }

      if( aborted ) {
        Viewing.result = Viewing.RESULT_TRUNCATED;
      }

      if( stopViewing ) {  
        Viewing.settings.viewTimeStop  = Date.now(); // record end of viewing
        Viewing.state.setState( Viewing.STATE_TEST ); // always transition to this state
      }
    }

    // Only Pose and Targets states have an error mode.
    // In error mode, we stay until errors fixed + interval; otherwise we revert.
    // We can only go PIES->ERROR->PIES and PIES->POSE->PIES not ERROR->PIES or vice versa.

    if( state == Viewing.STATE_ERROR ) {
      Viewing.updatePersistentError(); // update the duration of the error

      var debugError = false;
      if( Viewing.errorStateDebug ) {
        debugError = Graphics.showDebug();
//      }

      //if( Viewing.hasPersistentError() ) {
        // handle persistent error case
        //if( hasError ) {
        if( debugError ) {
          Viewing.timer.reset(); // hold it in this state until after x seconds after fixing it
          Graphics.hideMessage();
          //Graphics.showMessage( Errors.errorMessage, null, false ); // temporary
        }
        else { // no errors
          if( timeElapsed ) {
            // show the button to hide the persistent error mode:
            var help = "Thanks! All fixed.";
            var button = "Continue";
            Graphics.showMessage( help, button, false );//, "70%" );
          }
        }
      }
      else { // transient errors:
        if( hasError ) {
          Viewing.timer.reset(); // hold it in this state until after x seconds after fixing it
        }
        else { // no errors
          if( timeElapsed ) {
            Viewing.state.setStateOld(); // go back to previous state, pose or pies
            Points.clear();
          }
        }
      }
    }

    if( state == Viewing.STATE_POSE ) {
      // -- fix it, then we show the button. advance on click
      // if( hasError ) {
      //   Viewing.timer.reset(); // hold it in this state until after x seconds after fixing it
      //   Viewing.state.setState( Viewing.STATE_ERROR ); // go back to previous state
      // }
      // else
      // if( hasBadPose ) {
      if( Viewing.USE_CROSSHAIRS ) {
        //var x = parseFloat( xLabs.getConfig( "state.head.x" ) );
        //var y = parseFloat( xLabs.getConfig( "state.head.y" ) );
        var dxy = Errors.getPoseError();
        var xBad = Errors.hasBadPoseX();
        var yBad = Errors.hasBadPoseY();
        var scale = 100.0;
        Graphics.showCrosshairs( -dxy.x * scale, dxy.y * scale, !xBad, !yBad );
        if( hasNoFace ) {
          Viewing.timer.reset(); // hold it in this state until after x seconds after fixing it
          help = "No face detected.";

          Graphics.showMessage( help, null, false, "70%" );
        }
        else if( hasBadPose ) {
          Viewing.timer.reset(); // hold it in this state until after x seconds after fixing it
          var help = "";
          // fix X first, then Y
          if( xBad ) {
            if( x > 0.0 ) {
              help = "Please move the camera or laptop to the left.";
            }
            else {
              help = "Please move the camera or laptop to the right.";
            }
          }
          else { // must be Y
            if( y > 0.0 ) {
              help = "Please tilt the camera down a bit.";
            }
            else {
              help = "Please tilt the camera up a little.";
            }
          }
         
          Graphics.showMessage( help, null, false, "70%" );
        }
        else { // no errors
          //console.log( "no errors, timeElapsed = "+timeElapsed );

          if( timeElapsed ) {
            Graphics.showMessage( "That's great, thanks", "Next", false, "70%" );
          }
          else { // don't show button until timeout
            Graphics.showMessage( "That's great, thanks", null, false, "70%" );
          }
        }
      } // crosshairs
      else { // WEBCAM POSE (no crosshairs)
        if( !Graphics.faceCentred ) {
          Viewing.timer.reset(); // hold it in this state until after x seconds after fixing it
          Graphics.showMessage( "Adjust the camera to center your face in the picture.", null, false, "70%" );
          Graphics.showPose();
        }
        else { // no errors
          //console.log( "no errors, timeElapsed = "+timeElapsed );
          Graphics.showPose();

          if( timeElapsed ) {
            Graphics.showMessage( "Looks good!", "Next", false, "70%" );
          }
          else { // don't show button until timeout
            Graphics.hideMessage();
          }
        }
      }
    }

    // OK we only have PIES or FADE left.
    // What if we have an error, then goto error:
    if( state == Viewing.STATE_TARGETS ) {
        if( hasError ) {//ExceptPose ) {
          Viewing.timer.reset(); // hold it in this state until after x seconds after fixing it
          Viewing.state.setState( Viewing.STATE_ERROR ); // go back to previous state
          //TODO: consider requiring click to continue? 
          xLabs.resetCalibrationTruth(); // stop interpolation
        }
        else { // no error
          var complete = false;
          var knowGaze = false;
          var xGaze = 0;
          var yGaze = 0;

          if( Viewing.USE_HEAD_INTERACTION ) {
            Targets.update();
            complete = Targets.complete();
            knowGaze = ( Points.getIdx() != null );

            //if( complete == false && knowGaze == true ) {
            var xyHead = Targets.getScreenHead( Targets.get() );
            xGaze = xyHead.x;
            yGaze = xyHead.y;
            //}
          }
          else {
            Clicks.update();
            complete = Clicks.complete();
            knowGaze = Clicks.looking();
            var xy = Clicks.getScreen();
            xGaze = xy.x;
            yGaze = xy.y;
          }

          if( complete ) {
            Viewing.state.setState( Viewing.STATE_REMIND );
            xLabs.resetCalibrationTruth(); // stop interpolation
          }
          else { // not complete
            if( knowGaze ) {
              xLabs.updateCalibrationTruth( xGaze, yGaze ); // assume looking at mark under control
            }
            else {
              xLabs.resetCalibrationTruth(); // stop interpolation
            }
          }
        }
    }

    if( state == Viewing.STATE_TEST ) {

        Test.update();

        if( hasError ) {
          Viewing.timer.reset(); // hold it in this state until after x seconds after fixing it
          Viewing.state.setState( Viewing.STATE_ERROR ); // go back to previous state
          //TODO: consider requiring click to continue? 
          xLabs.resetCalibrationTruth(); // stop interpolation
        }
        else { // no error
          Targets.update();
          if( Targets.complete() ) {
            Viewing.state.setState( Viewing.STATE_POST );
            xLabs.resetCalibrationTruth(); // stop interpolation
          }
          else { // not complete
            if( Points.getIdx() != null ) {
              var xyTarget = Targets.getScreen( Targets.get() );
              xLabs.updateCalibrationTruth( xyTarget.x, xyTarget.y ); // assume looking at mark under control
            }
            else {
              xLabs.resetCalibrationTruth(); // stop interpolation
            }
          }
        }
    }

    if( state == Viewing.STATE_FADE ) {
      // dont care about errors, just get through this part
      if( timeElapsed ) {
        Viewing.state.setState( Viewing.STATE_VIEW ); // start gaze
      }
    }

    if( state == Viewing.STATE_VIEW ) {
      // dont care about errors, just get through this part
      if( timeElapsed ) {
        Viewing.result = Viewing.RESULT_COMPLETE;
//        Viewing.setResult( true ); // fully elapsed successful view
//        Viewing.state.setState( Viewing.STATE_POST ); // start gaze
        Viewing.state.setState( Viewing.STATE_TEST ); // start gaze
      }
    }

  },

  show : function( id ) {
    document.getElementById( id ).style.display = "block";
  },
  hide : function( id ) {
    document.getElementById( id ).style.display = "none";
  },

  onStateChanged : function() {
    // only happens on state change:
    var duration = Viewing.transitionTime; // default
    var state = Viewing.state.getState();
    console.log( "State changed to: " + Viewing.state.getState() );

    Viewing.body = $("body");
    var addedClasses = [];
    var removedClasses = [];

    if( state == Viewing.STATE_ERROR ) {
      //Viewing.aboutHide();
      Viewing.onPersistentError(); // update the number of times this happens
      //Camera.show();
    }
    else if( state == Viewing.STATE_NONE ) {
      Camera.hide();
      xLabs.setConfig( "system.mode", "off" );
      Viewing.show( "info" );
      Graphics.hideCrosshairs();
    }
    else if( state == Viewing.STATE_COMFORT ) {
      Camera.hide();
      xLabs.setConfig( "calibration.clear", "1" ); // this also clears the memory buffer
      xLabs.setConfig( "system.mode", "training" );
      FullScreen.start();
      Viewing.hide( "info" );
      Graphics.hideCrosshairs();
    }
    else if( state == Viewing.STATE_POSE ) {
      Errors.setErrorMask( true, true, true );
      Viewing.hide( "info" );
      if( Viewing.USE_CROSSHAIRS ) {
      }
      else {
        Camera.show();
      }

      // start logging in the pose step. This means we maximally capture the data about the way the viewer interacted with calibration.
      // we also record the view start time to allow us to filter the relevant bits of the logs.
      Viewing.clearLogs();
      Viewing.startLogs();
    }
    else if( state == Viewing.STATE_TARGETS ) {
      Errors.setErrorMask( true, false, true ); // pose may still be bad if fixed quickly.
      Camera.hide();
      Viewing.hide( "info" );
      Graphics.hideCrosshairs();

      if( Viewing.state.getStateOld() != Viewing.STATE_ERROR ) {
        if( Viewing.USE_HEAD_INTERACTION ) {
          Targets.reset();  
        }
        else {
          Clicks.reset();  
        }
      }
    }
    else if( state == Viewing.STATE_REMIND ) {
      Errors.setErrorMask( true, true, true );
      Camera.hide();
      xLabs.calibrate();
      Viewing.show( "reminder" );
      Graphics.hideCrosshairs();
      //addedClasses.push( "xlabs-instructions" );
      //Viewing.hide( "info" );
    }
    else if( state == Viewing.STATE_FADE ) {
      Camera.hide();
      Viewing.hide( "reminder" );
      Graphics.hideCrosshairs();
    }
    else if( state == Viewing.STATE_VIEW ) {
      Camera.hide();
      Viewing.settings.viewTimeStart = Date.now();
      Viewing.hide( "info" );
      Graphics.hideCrosshairs();
      duration = Viewing.duration;
      addedClasses.push( "xlabs-viewing" );
      //removedClasses.push( "xlabs-instructions" );
    }
    else if( state == Viewing.STATE_TEST ) {
      Camera.hide();
      Viewing.hide( "info" );
      Graphics.hideCrosshairs();
      removedClasses.push( "xlabs-viewing" );

      if( Viewing.state.getStateOld() != Viewing.STATE_ERROR ) { // on return from error state
        Targets.reset();  
      }

      Test.reset();
      var xyTarget = Targets.getScreen( Targets.idxTarget );
      Test.setTarget( xyTarget.x, xyTarget.y );
    }
    else if( state == Viewing.STATE_POST ) {
      console.log( "on state = post, result = " + Viewing.result );


      // set a suitable error message to the user if the result was not normal.
      if( Viewing.result == Viewing.RESULT_CANCELLED ) { // manual exist
        document.getElementById( "feedback" ).innerHTML = "You ended the viewing early, by exiting fullscreen mode. Would you like to submit the data collected or give us any feedback about your experience?";
      }
      else if( Viewing.result == Viewing.RESULT_ABORTED ) {
        document.getElementById( "feedback" ).innerHTML = "Your viewing was not successful. This is usually due to bad lighting, but we'd like to get your feedback. You may want to try again during daytime or with a better seating position. Please tell us about your experience to help us improve the service.";
      }
      else if( Viewing.result == Viewing.RESULT_TRUNCATED ) { // 
        document.getElementById( "feedback" ).innerHTML = "Your viewing was not successful. This usually happens because you changed position or looked away during viewing. You may want to try again? Please provide any feedback you think relevant:";
      }
      else if( Viewing.result == Viewing.RESULT_COMPLETE ) {
        // check accuracy
        var pc = Test.getScoreOverall();
        var pcMin = Viewing.ACCURACY_MIN_PC;
        if( pc < pcMin ) {
          document.getElementById( "feedback" ).innerHTML = "Your viewing was successful but not accurate (you got "+pc+"% but "+pcMin+"% is required). This usually happens when viewers change position after calibration. You can submit this view, or cancel and try again if the study organiser has enabled repeat views.";
        }
        else {
          // Nothing: Normal message is fine. The view was perfect.
        }
      }
      else { // unknown result status
        // Leave message unchanged
      }

      //Viewing.settings.viewTimeStop  = Date.now();
      Viewing.stopLogs();
      Viewing.requestLogs(); // triggers an async event when the logs are produced.
      //Viewing.show( "info" );
      xLabs.setConfig( "system.mode", "off" );
      addedClasses.push( "xlabs-complete" );
      removedClasses.push( "xlabs-viewing" );
      Viewing.show( "results" );
      Viewing.hide( "pose" );
      Viewing.hide( "reminder" );
      Camera.hide();
      Graphics.hideCrosshairs();
      Graphics.hideTarget();
      Graphics.hideClickTarget();
      Graphics.hideMessage();
    }

    // apply any class changes
    removedClasses.forEach( function( cls ) {
      Viewing.body.removeClass( cls );
    } );
    addedClasses.forEach( function( cls ) {
      Viewing.body.addClass( cls );
    } );
 
    // reset timer:
    Viewing.timer.setDuration( duration );
    Viewing.timer.reset();
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Key events
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  start : function() {
    console.log( "start" );
    Viewing.state.setState( Viewing.STATE_COMFORT );
  },

  showMedia : function() {
    console.log( "showMedia" );
    Viewing.state.setState( Viewing.STATE_FADE );
  },

  onCalibrationComplete : function() {
    //console.log( "calibration complete." );
    var state = Viewing.state.getState();
    if( state == Viewing.STATE_TARGETS ) {
      Viewing.state.setState( Viewing.STATE_REMIND ); // all the successor states are n+1 of the button confirms
    }
    else if( state == Viewing.STATE_TEST ) {
      // Nothing.
    }

  },

  onFullScreenChanged : function( isFullScreen ) {
    console.log( "On full screen changed" );
    if( Viewing.fullScreenStarted ) {
      if( Viewing.result == Viewing.RESULT_NONE ) { // note cancelled unless another reason for fullscreen exit already specified:
        Viewing.result = Viewing.RESULT_CANCELLED;
      }
      Viewing.state.setState( Viewing.STATE_POST );
    }
    else {
      Viewing.state.setState( Viewing.STATE_COMFORT );
      Viewing.fullScreenStarted = true;
    }    
/*    var state = Viewing.state.getState();

    if( state == Viewing.STATE_NONE ) {
      if( isFullScreen == true ) {
        Viewing.state.setState( Viewing.STATE_COMFORT );
      }

      return;
    }

    // always transition to post-viewing if fullscreen is cancelled for any reason:
    //if( isFullScreen == false ) {
      Viewing.setResult( false );
      Viewing.state.setState( Viewing.STATE_POST );
    //}*/
  },

  createSettings : function() {
    Viewing.settings = {
        screenWidth  : screen.width,
        screenHeight : screen.height,
        screenDpi    : xLabs.getDpi(),
        viewTimeStart : Date.now(),
        viewTimeStop  : Date.now()
    };
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Logging
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  logScrollEnabled : false,
  logMouseEnabled : false,

  logScrollEvent : function( event ) {
    if( Viewing.logScrollEnabled == false ) {  
      return;
    }

    //console.log( "on scroll" );
    //var row = { x: window.pageXOffset, y: window.pageYOffset, t: Date.now() };
    var row = Date.now() + "," + window.pageXOffset + "," + window.pageYOffset; // t,x,y
    Viewing.scrolllog.push( row );
  },

  logMouseMoveEvent : function() {
    if( Viewing.logMouseEnabled == false ) {  
      return;
    }

    //console.log( "on mouse move" );
    //var row = { t: Date.now(), x: Mouse.xMouseScreen, y: Mouse.yMouseScreen };
    var row = Date.now() + "," + Mouse.xMouseScreen + "," + Mouse.yMouseScreen;
    Viewing.mouselog.push( row );
  },

  addScrollListener : function() {
    window.onscroll = Viewing.logScrollEvent;
    //Viewing.logScrollEvent();
  },

  startLogs : function() {
    console.log( "logs: start" );
    // enable xlabs logs
    Viewing.setLogs( "enabled", "1" );

    // enable UI interaction logs    
    Viewing.logScrollEnabled = true;
    Viewing.logMouseEnabled = true;

    // add 1 entry for initial position
    Viewing.logScrollEvent();
    Viewing.logMouseMoveEvent();
  },

  stopLogs : function() {
    console.log( "logs: stop" );
    // enable xlabs logs
    Viewing.setLogs( "enabled", "0" );

    // enable UI interaction logs    
    Viewing.logScrollEnabled = false;
    Viewing.logMouseEnabled = false;
  },

  clearLogs : function() {
    console.log( "logs: clear" );
    // clear xlabs logs
    Viewing.setLogs( "clear", "1" );

    // clear UI interaction logs    
    Viewing.scrolllog = [];
    Viewing.mouselog = [];
  },

  requestLogs : function() {
    console.log( "logs: request" );
    xLabs.setConfig( "watch.temp.id", "xl-log-watch" ); // ask for the log to be copied to this DOM element
    xLabs.setConfig( "truth.temp.id", "xl-log-click" ); // ask for the log to be copied to this DOM element
    xLabs.setConfig( "error.temp.id", "xl-log-error" ); // ask for the log to be copied to this DOM element
    xLabs.setConfig(  "gaze.temp.id", "xl-log-gaze"  ); // ask for the log to be copied to this DOM element
  },

  setLogs : function( key, value ) {
    console.log( "1logs set key="+key+"="+value );
    xLabs.setConfig( "watch.temp."+key, value );
    console.log( "2logs set key="+key+"="+value );
    xLabs.setConfig( "truth.temp."+key, value );
    console.log( "3logs set key="+key+"="+value );
    xLabs.setConfig( "error.temp."+key, value );
    console.log( "4logs set key="+key+"="+value );
    xLabs.setConfig(  "gaze.temp."+key, value );
  },

/*  setResult : function( success ) {
    if( success ) {
      Viewing.result = Viewing.RESULT_COMPLETE;
    }
    else {
      Viewing.result = Viewing.RESULT_CANCELLED;
    }
  },*/

  onGotAllLogs : function() {
    Viewing.compileResults();
  },

  // enter results into form  
  compileResults : function() {
    console.log( "compileResults()" );
    // ContentView.create(
    //  :result => params[:result],           js
    //  :settings => params[:settings],       ?js

    //  :gazelog => params[:gazelog],               xl
    //  :clicklog => params[:clicklog],             xl (truth)
    //  :watchlog => params[:watchlog],             xl
    //  :errorlog => params[:errorlog],             xl

    //  :scrolllog => params[:scrolllog],     ?js
    //  :mouselog => params[:mouselog],       ?
    //  :note => params[:note],               html form
    //  :status => params[:status] )          html form
    $( "#result"    ).val( Viewing.result );
    $( "#settings"  ).val( JSON.stringify( Viewing.settings ) );

    var scores = Test.getScores();
    $( "#score"  ).val( JSON.stringify( scores ) );

    $( "#viewer-score"  )[ 0 ].innerHTML = Test.getScoreOverall() +"%";

    Viewing.compileResultLog( "xl-log-watch", "watchlog" );
    Viewing.compileResultLog( "xl-log-click", "clicklog" );
    Viewing.compileResultLog( "xl-log-error", "errorlog" );
    Viewing.compileResultLog( "xl-log-gaze" , "gazelog"  );

    $( "#scrolllog" ).val( JSON.stringify( Viewing.scrolllog ) );
    $(  "#mouselog" ).val( JSON.stringify( Viewing.mouselog  ) );
  },

  compileResultLog : function( logId, formId ) {
    var logElement = document.getElementById( logId );
    var preElement = logElement.getElementsByTagName( "pre" )[ 0 ];
    var logData = preElement.innerHTML;
    $( "#"+formId ).val( JSON.stringify( logData ) );
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Timer
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  update : function() {
    Viewing.setTimeout();
    Viewing.updateState();

    var state = Viewing.state.getState();
//console.log( "state is "+state );

    if( state == Viewing.STATE_VIEW ) {
    }
    else if( state == Viewing.STATE_ERROR ) {
      Graphics.hideTarget();
      Graphics.hideClickTarget();
      Graphics.hidePose();
      if( Viewing.hasPersistentError() ) {
        // More complex error handling
      }
      else {
        Graphics.showMessage( Errors.errorMessage, null, false );
      }
    }
    else if( state == Viewing.STATE_NONE ) {
      Graphics.hideTarget();
      Graphics.hideClickTarget();
      Graphics.hidePose();
      Graphics.hideMessage();
    }
    else if( state == Viewing.STATE_COMFORT ) {
      Graphics.hideTarget();
      Graphics.hideClickTarget();
      Graphics.hidePose();
      Graphics.showMessage( "Take a minute to make yourself comfortable", "Next", false );
    }
    else if( state == Viewing.STATE_POSE ) {
      Graphics.hideTarget();
      Graphics.hideClickTarget();
      if( Viewing.USE_CROSSHAIRS ) {
        Graphics.hidePose();
      }
      else {
        Graphics.showPose();
      }
    }
    else if( state == Viewing.STATE_TARGETS ) {
      Graphics.hidePose();
      Graphics.hideMessage();
      if( Viewing.USE_HEAD_INTERACTION ) {
        Graphics.showTarget();
      }
      else {
        Graphics.showClickTarget();
      }
    }
    else if( state == Viewing.STATE_TEST ) {
      Graphics.hidePose();
      Graphics.hideMessage();
      Graphics.showTarget();
    }
    else if( state == Viewing.STATE_REMIND ) {
      Graphics.hideTarget();
      Graphics.hideClickTarget();
      Graphics.hideMessage();
//      Graphics.showMessage( "All done. Demo coming up...", "Next", false );
    }
    else if( state == Viewing.STATE_FADE ) {
      Graphics.hideTarget();
      Graphics.hideClickTarget();
      Graphics.hideMessage();
    }
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // xLabs API
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  onXlabsReady : function() {
    console.log( "xLabs OK." );
    //xLabs.setConfig( "system.mode", "training" );
  },
  onXlabsState : function() {
    //console.log( "on xLabs state." );
    Errors.update();
    Head.update();
  },
  onXlabsIdPath : function( id, path ) {
    console.log( "received log id="+id+" path="+path+" count="+Viewing.xLabsLogCount );
    
    // Just enter the logs directly
    //if( id == "xl-log-watch" ) {
    //}
    //else if( id == "xl-log-truth" ) {
    //}
    //else if( id == "xl-log-error" ) {
    //}
    //else if( id == "xl-log-gaze" ) {
    //}

    Viewing.xLabsLogCount = Viewing.xLabsLogCount + 1;

    if( Viewing.xLabsLogCount == 4 ) {  
      Viewing.onGotAllLogs();
    }
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Setup
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  setup : function( duration ) {
    // disable gaze on page navigation, if not before
    Errors.setup();

    window.addEventListener( "beforeunload", function() {
        xLabs.setConfig( "system.mode", "off" );
    });

    Viewing.duration = duration;
    Viewing.timer = new Timer();
    Viewing.timer.setDuration( Viewing.transitionTime );
    Viewing.state = new State( Viewing.STATES, Viewing.STATE_NONE, Viewing.onUiStateChanged );
    Viewing.state.onStateChanged = Viewing.onStateChanged;

    FullScreen.addListener();
    FullScreen.callback = Viewing.onFullScreenChanged;
    Mouse.mouseDownCallback = Viewing.onMouseDown;
    Mouse.mouseUpCallback   = Viewing.onMouseUp;
    Mouse.mouseMoveCallback = Viewing.onMouseMove;

    Targets.completedCallback = Viewing.onCalibrationComplete;
    Clicks .completedCallback = Viewing.onCalibrationComplete;

    document.getElementById( "start" ).onclick = Viewing.start;
    document.getElementById( "show" ).onclick = Viewing.showMedia;
    document.getElementById( "button" ).onclick = Viewing.onButtonClicked;
    document.getElementById( "cCircle" ).addEventListener( "click", Viewing.onTargetClicked );
    document.getElementById( "text" ).addEventListener( "click", Viewing.onTargetClicked );
    document.getElementById( "clickCircle" ).addEventListener( "click", Viewing.onClickTargetClicked );
    document.getElementById( "clickText" ).addEventListener( "click", Viewing.onClickTargetClicked );
    document.getElementById( "clickCircle" ).addEventListener( "click", Viewing.onClickTargetClicked );
    document.getElementById( "clickText" ).addEventListener( "click", Viewing.onClickTargetClicked );
    document.getElementById( "clickCircle" ).addEventListener( "mouseover", Viewing.onClickTargetMouseOver );
    document.getElementById( "clickCircle" ).addEventListener( "mouseout", Viewing.onClickTargetMouseOut );

    xLabs.setToken( "4sds34k5d45pn4" );
    xLabs.setup( Viewing.onXlabsReady, Viewing.onXlabsState, Viewing.onXlabsIdPath );

    Viewing.createSettings();
    Viewing.addScrollListener();
    Viewing.result = Viewing.RESULT_NONE;
    Viewing.setTimeout();

    Viewing.resetPersistentError();
  }

};

$(document).ready( function() {

  if( $( ".mediaViewing" ).length == 0 ) {
    return; // filter this stuff when it's not a viewing page.
  }

  console.log( "Viewing JS module init" );
  var parameters = document.getElementById( "viewing-parameters" );
  var duration = parseInt( parameters.getAttribute( "data-timeout" ) );
  console.log( "Viewing JS module timeout = "+duration );

  Viewing.setup( duration );

} );

