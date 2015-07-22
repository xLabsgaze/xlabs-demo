
///////////////////////////////////////////////////////////////////////////////
// Passive calibration gaze tracking.
// Click the floating coloured circles to pop them; they randomly re-inflate.
// Gaze also pops balloons when calibrated.
///////////////////////////////////////////////////////////////////////////////
var Balloons = {

  complete : false,

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Mouse Listener
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  onMouseUp : function() {
    var x = Mouse.xMouseScreen;
    var y = Mouse.yMouseScreen;

    var doc = xLabs.scr2doc( x, y );
    //console.log( "click@ "+doc.x+","+doc.y );
    Graph.hideCircleAt( doc.x, doc.y, 1.0 );
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Key events
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  start : function() {
    xLabs.setConfig( "system.mode", "learning" ); // this also clears the memory buffer
    document.getElementById( "start" ).style.display = "none";
    Graph.show();
  },

  update : function() {

    if( Balloons.complete == true ) {
      return;
    }
    
    // detect win condition:
    var nbrCircles = Graph.getCountCircles();
    var nbrCirclesClicked = Graph.getCountCircleClass( "tiny" );
    var fractionClicked = ( nbrCirclesClicked / nbrCircles );

    // console.log( "frac="+  fractionClicked  );
    if( fractionClicked > 0.75 ) {
      xLabs.setConfig( "system.mode", "off" );
      document.getElementById( "win" ).style.display = "block";
      document.getElementById( "graph" ).style.display = "none";
      document.getElementById( "about" ).style.display = "none";
      Balloons.complete = true;
      return;
    }

    // update gaze tracking
    Gaze.update();
    Graph.updateWithoutSelection();//Selection( screen.width * 0.5, screen.height * 0.5 );

    if( Gaze.available == true ) {
      var doc = xLabs.scr2doc( Gaze.xMeasuredSmoothed, Gaze.yMeasuredSmoothed );
      Graph.hideCircleAt( doc.x, doc.y, 1.2 );
    }

    // randomly restore balloons
    var pInflateBalloon = 0.06;
    Graph.showCircleRandom( pInflateBalloon );
  }, 

  // xLabs API
  onXlabsReady : function() {
  },
  onXlabsState : function() {
  },

  // Setup
  setup : function() {
    window.addEventListener( "beforeunload", function() {
        xLabs.setConfig( "system.mode", "off" );
    });

    var updateInterval = 50;
    setInterval( Balloons.update, updateInterval );

    var colours = "../colours/colours_dark.json";
    Graph.setup( "graph", colours, false );

    Gaze.xyLearningRate = 1.0; //0.8;

    Mouse.mouseUpCallback = Balloons.onMouseUp;

    document.getElementById( "start" ).onclick = Balloons.start;

    xLabs.setup( Balloons.onXlabsReady, Balloons.onXlabsState, null, "myToken" );
  }

};

Balloons.setup();
