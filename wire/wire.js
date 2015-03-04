
///////////////////////////////////////////////////////////////////////////////
// Interactive calibration mode: You play a game to get some detailed 
// calibration data.
///////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Design
  // Has a number of states, and uses a finite state machine to decide what state it's in.
  // Errors move it to the error state, and after a min time and a successful fix, it moves back.
  // It remembers where it was.
  //
  // On starting the game, there's a link that says "help" or "what's going on?" or something.
  // This takes you to the info page --> content depends on whether you come from the game or the 
  // pose part.
  //
  // We assume the page takes care of configuring the system properly. We should emit a count of the
  // successful game completions. And not loop - just stay in a terminal state.
  // 
  // We start in the game page and only go to pose if it's bad. We go to error if there's a video 
  // error.
  //
  // START --> GAME <--> POSE <--> ERROR
  //                <--> ERROR
  //                <--> INFO
  //
  // TODO: Game animations (crash, flash arrow, win)
  // TODO: Tick as soon as issue fixed.
  // TODO: Resume game from previous point iff err during play
  ///////////////////////////////////////////////////////////////////////////////////////////////////
var Wire = {

  // States
  UI_STATE_ERROR : 0,
  UI_STATE_INFO : 1,
  UI_STATE_POSE : 2,
  UI_STATE_GAME : 3,
  UI_STATE_GAZE : 4,
  UI_STATE_NONE : 5,
  UI_STATES : 6,

  GAME_STATE_READY : 0, 
  GAME_STATE_PLAYING : 1, 
  GAME_STATE_CRASHED : 2, 
  GAME_STATE_COMPLETE : 3,
  GAME_STATES : 4,

  // Game
  uiState : null,
  gameState : null,
  transitionTimer : null,
  gazeTimer : null,

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Mouse Listener
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  onMouseUp : function() {
    var cStart = Path.getCoordinateStart();
    var xStart = xLabs.scr2docX( Path.path2docX( cStart.x ) );
    var yStart = xLabs.scr2docY( Path.path2docY( cStart.y ) );

    var mouseX = xLabs.scr2docX( Mouse.xMouseScreenDown );
    var mouseY = xLabs.scr2docY( Mouse.yMouseScreenDown );
    var d = Util.distance( mouseX, mouseY, xStart, yStart );

    //console.log( "start="+xStart+","+yStart+" click="+xLabsCI.mouseUpScreenX+","+xLabsCI.mouseUpScreenY );
    var radius = Path.getTargetSize() * 2.0;
    if( d < radius ) {
      Head.reset();
      Wire.gameState.setState( Wire.GAME_STATE_PLAYING );
    }
  },

  onMouseMove : function() {
    //var x = Mouse.xMouseScreen;
    //var y = Mouse.yMouseScreen;
    //Grid.selectTileNearest( x, y );
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Game methods
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  updateUiState : function() {
    var state = Wire.uiState.getState();
    var stateNew = null;

    //console.log( "UI state="+state );

    if( state == Wire.UI_STATE_NONE ) {
      return;
    }

    // if we're using gaze on the page, then any substantial movement or 
    if( state == Wire.UI_STATE_GAZE ) {
      var stopGaze = false;
      if( Errors.hasNoFace() ) {   
        console.log( "stop gaze on no face" );
        stopGaze = true;
      }

      if( Wire.gazeTimer.hasElapsed() ) { 
        console.log( "stop gaze on no face" );
        stopGaze = true;
      }
//      else if( Errors.hasBadPose() ) {
//        stopGaze = true;
//      }

      if( stopGaze ) {  
        Wire.uiState.setState( Wire.UI_STATE_GAME ); // always transition to this state
      }

      return;
    }

    // Otherwise, we want to basically always show the game, but allow errors to take us to other screens:
    if( Errors.hasErrorExcludingPose() ) {
      //console.log( "has errors" );
      if( state == Wire.UI_STATE_ERROR ) {
        Wire.transitionTimer.reset(); // hold it in this state until after x seconds after fixing it
      }

      var gameState = Wire.gameState.getState();
      if( gameState != Wire.GAME_STATE_PLAYING ) {
        //stateNew = Wire.UI_STATE_ERROR;
        Wire.uiState.setState( Wire.UI_STATE_ERROR ); // always transition to this state
        return;
      }
    }
    else if( Errors.hasBadPose() ) {
      //console.log( "has bad pose" );
      if( state == Wire.UI_STATE_POSE ) {
        Wire.transitionTimer.reset(); // hold it in this state until after x seconds after fixing it
      }
      else if( state == Wire.UI_STATE_GAME ) {
        //console.log( "state is game" );
        //if( this.gameGetPlaying() == false ) { // game not in play
        //if( Path.timePaused > 0 ) { // game not in play
        var gameState = Wire.gameState.getState();
        if( gameState == Wire.GAME_STATE_READY ) {
          //console.log( "game NOT in play" );
          //if( timeElapsed ) {
          //  Wire.uiState.setState( Wire.UI_STATE_POSE );
          //}
          stateNew = Wire.UI_STATE_POSE;
        } 
      }
      else if( state == Wire.UI_STATE_ERROR ) {
        //console.log( "state is err" );
        //if( timeElapsed ) {
        //  Wire.uiState.setState( Wire.UI_STATE_POSE );
        //}
        stateNew = Wire.UI_STATE_POSE;
      }
    }
    else { // no errors
      //if( timeElapsed ) {
      //  Wire.uiState.setState( Wire.UI_STATE_GAME );
      //}
      if( state == Wire.UI_STATE_GAME ) {
        var gameState = Wire.gameState.getState();
        if( gameState == Wire.GAME_STATE_COMPLETE ) {
          stateNew = Wire.UI_STATE_GAZE; // transition to gaze state
        }
      }
      else {
        stateNew = Wire.UI_STATE_GAME;
      }
    }

    // desired state changes only eventuate once a timer has elapsed:
    if( stateNew != null ) {
      var timeElapsed = Wire.transitionTimer.hasElapsed();
      if( timeElapsed ) {
        Wire.uiState.setState( stateNew );
      }
    }
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Game state
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  updateGameState : function() {

    Head.update();
    Path.timeUpdate();

    var state = Wire.gameState.getState();
    if( state == Wire.GAME_STATE_PLAYING ) {

      // update truth coords
      var c = Path.getHeadScreenCoordinate();
      //xLabs.setTruthScreen( c.x, c.y );
      xLabs.updateCalibrationTruth( c.x, c.y );
      //console.log( "truth x,y="+c.x+","+c.y );

      // detect termination of playing: crash, or complete.
      if( Path.complete() ) {
        Wire.gameState.setState( Wire.GAME_STATE_COMPLETE ); // has no effect when already done
      }

      // detect collisions:
      var h = Path.hazardGetCollision(); // this returns the hazard
      if( h >= 0 ) {
        Wire.gameState.setState( Wire.GAME_STATE_CRASHED );
      }
    }
  },

  onUiStateChanged : function() {
    Wire.transitionTimer.reset();

    console.log( "UI state changed to: " + Wire.uiState.getState() );

    var uiState = Wire.uiState.getState();

    if( uiState == Wire.UI_STATE_NONE ) {
      xLabs.setConfig( "system.mode", "off" );
    }
    else if( uiState == Wire.UI_STATE_ERROR ) {
      Canvas.show();
    }
    else if( uiState == Wire.UI_STATE_INFO ) {
      Canvas.show();
    }
    else if( uiState == Wire.UI_STATE_POSE ) {
      Canvas.show();
    }
    else if( uiState == Wire.UI_STATE_GAME ) {
      xLabs.setConfig( "system.mode", "training" );
      Canvas.show();
    }
    else if( uiState == Wire.UI_STATE_GAZE ) {
      //document.getElementById( "grid" ).style.display = "block";
      //Grid.show();
      Graph.show();
      Canvas.show();
      Wire.gazeTimer.reset();
    }

    // all UI state changes cause a reset of the game state:
    Wire.gameState.setState( Wire.GAME_STATE_READY ); // has no effect when already done
  },
  
  onGameStateChanged : function() {
    // only happens on state change:
    var state = Wire.gameState.getState();
    console.log( "Game state changed to: " + Wire.gameState.getState() );

    xLabs.resetCalibrationTruth();

    if( state == Wire.GAME_STATE_READY ) {
      //xLabs.setTruthEnabled( false );
      Path.timePause();
      Path.timeReset();
    }
    else if( state == Wire.GAME_STATE_PLAYING ) {
      Head.reset();
      Path.timeReset();
      Path.timeResume();
      //xLabs.setTruthEnabled( true );
    }
    else if( state == Wire.GAME_STATE_CRASHED ) {
      //xLabs.setTruthEnabled( false );
      // no calibrrate, we don't know how much data was obtained
      //Path.timePause(); // end of game
      //Path.timeReset();
      // transition straight to reset/ready:
      Wire.gameState.setState( Wire.GAME_STATE_READY );
    }
    else if( state == Wire.GAME_STATE_COMPLETE ) {
      //xLabs.setTruthEnabled( false );
      xLabs.calibrate();
      Path.timePause(); // end of game
      Path.timeReset();
    }
  },

  paint : function() {
    Wire.update();

    var state = Wire.uiState.getState();
    if( state == Wire.UI_STATE_NONE ) {
      Canvas.hide(); // lazy
      // Debug with mouse:
      //Grid.selectTileCheck( Mouse.xMouseScreen, Mouse.yMouseScreen );
    }
    else if( state == Wire.UI_STATE_ERROR ) {
      Canvas.show(); // lazy
      Paint.paintError();
    }
    else if( state == Wire.UI_STATE_INFO ) {
      Canvas.show(); // lazy
      Paint.paintInfo();
    }
    else if( state == Wire.UI_STATE_POSE ) {
      Canvas.show(); // lazy
      Paint.paintPose();
    }
    else if( state == Wire.UI_STATE_GAME ) {
      Canvas.show(); // lazy
      Paint.paintGame();
      if( Path.timePaused == 1 ) {
        Paint.paintLegend();
      }
    }
    else if( state == Wire.UI_STATE_GAZE ) {
      Canvas.show();
      Canvas.clear();
      Gaze.update();
      //Grid.selectTileNearest( Gaze.xSmoothed, Gaze.ySmoothed );
      //Grid.selectTileCheck( Gaze.xSmoothed, Gaze.ySmoothed );
      Graph.updateSelection( Gaze.xSmoothed, Gaze.ySmoothed );
      Gaze.paint();
    }
  },

  update : function() {
    Errors.update();
    Wire.updateUiState();
    Wire.updateGameState();
  }, 

  onXlabsReady : function() {
//    xLabs.setConfig( "system.mode", "training" );
  },
  onXlabsState : function() {
  },

  start : function() {
    Wire.uiState.setState( Wire.UI_STATE_GAME );
  },

  setup : function() {
    var colours = "../colours/colours_dark.json";
    Graph.setup( "graph", colours, false );

    Wire.gazeTimer = new Timer();
    Wire.gazeTimer.setDuration( 50000 );

    Wire.transitionTimer = new Timer();
    Wire.transitionTimer.setDuration( 2000 );

    Wire.  uiState = new State( Wire.  UI_STATES, Wire.  UI_STATE_NONE, Wire.onUiStateChanged );
    Wire.gameState = new State( Wire.GAME_STATES, Wire.GAME_STATE_READY, Wire.onGameStateChanged );

    Path.setup();
    Canvas.paintCallback = Wire.paint;
    Mouse.mouseUpCallback = Wire.onMouseUp;

    xLabs.setup( Wire.onXlabsReady, Wire.onXlabsState );

    document.getElementById( "start" ).onclick = Wire.start;

    // Debug with mouse:
    //Grid.show();
  }

};

// Normal gaze use:
Wire.setup();
