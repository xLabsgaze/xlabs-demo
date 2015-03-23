
///////////////////////////////////////////////////////////////////////////////////////////////////
// Utilities to paint gaze on screen.
///////////////////////////////////////////////////////////////////////////////////////////////////
var Gaze = {

  gazeMinSize : 90,
  gazeMaxScreenFrac : 0.5,
  maxConfidence : 8.0, // for simplePoly: 8.0, for compoundPoly: 10.0,
  available : false,

  // Gaze
  xMeasuredSmoothed : 0.0,
  yMeasuredSmoothed : 0.0,
  xSmoothed : 0.0,
  ySmoothed : 0.0,
  cSmoothed : 0.0, 
  
  xyLearningRate : 0.25,
   cLearningRate : 0.05,

  update : function() {
    Gaze.available = false;
    var trackingSuspended = parseInt( xLabs.getConfig( "state.trackingSuspended" ) );
    var calibrationStatus = parseInt( xLabs.getConfig( "calibration.status" ) );

    if( ( calibrationStatus == 0 ) || ( trackingSuspended == 1 ) ) {
      //console.log( "cs: "+calibrationStatus + " ts="+trackingSuspended );
      return;
    }

    Gaze.available = true;

    var xMeasured = parseFloat( xLabs.getConfig( "state.gaze.measured.x" ) ); // screen coords
    var yMeasured = parseFloat( xLabs.getConfig( "state.gaze.measured.y" ) ); // screen coords
    var xEstimate = parseFloat( xLabs.getConfig( "state.gaze.estimate.x" ) ); // screen coords
    var yEstimate = parseFloat( xLabs.getConfig( "state.gaze.estimate.y" ) ); // screen coords
    var c = parseFloat( xLabs.getConfig( "state.calibration.confidence" ) ); 

    xEstimate = Math.max( 0, Math.min( screen. width-1, xEstimate ) );
    yEstimate = Math.max( 0, Math.min( screen.height-1, yEstimate ) );

    // condition c into a continuous unit value
    if( c > Gaze.maxConfidence ) {
      c = Gaze.maxConfidence;
    }
    if( c < 0 ) c = Gaze.maxConfidence;
    var cUnit = c / Gaze.maxConfidence;

    // smooth these measurements
    if( isNaN( Gaze.xSmoothed         ) ) Gaze.xSmoothed = screen.width * 0.5;
    if( isNaN( Gaze.ySmoothed         ) ) Gaze.ySmoothed = screen.height * 0.5;
    if( isNaN( Gaze.xMeasuredSmoothed ) ) Gaze.xMeasuredSmoothed = screen.width * 0.5;
    if( isNaN( Gaze.yMeasuredSmoothed ) ) Gaze.yMeasuredSmoothed = screen.height * 0.5;
    
    Gaze.xMeasuredSmoothed = Util.lerp( Gaze.xMeasuredSmoothed, xMeasured, Gaze.xyLearningRate );
    Gaze.yMeasuredSmoothed = Util.lerp( Gaze.yMeasuredSmoothed, yMeasured, Gaze.xyLearningRate );
    Gaze.xSmoothed = Util.lerp( Gaze.xSmoothed, xEstimate, Gaze.xyLearningRate );
    Gaze.ySmoothed = Util.lerp( Gaze.ySmoothed, yEstimate, Gaze.xyLearningRate );
    Gaze.cSmoothed = Util.lerp( Gaze.cSmoothed, cUnit, Gaze.cLearningRate );
  },
 
  paint : function() {
    var gazeMaxSize = screen.height * Gaze.gazeMaxScreenFrac;
    var radiusRange = gazeMaxSize - Gaze.gazeMinSize;
    var radius = ( radiusRange * Gaze.cSmoothed ) + Gaze.gazeMinSize;

    var xyCanvas = xLabs.scr2doc( Gaze.xSmoothed, Gaze.ySmoothed );
    var xCanvas = xyCanvas.x; 
    var yCanvas = xyCanvas.y;
    
    var style = "rgba( 255, 0, 0, 0.4 )";

    Canvas.context.beginPath();
    Canvas.context.lineCap = "round";
    Canvas.context.lineWidth = 8;
    Canvas.context.strokeStyle = style;
    Canvas.context.arc( xCanvas, yCanvas, radius, 0, 2 * Math.PI, false);
    Canvas.context.stroke();
  }

};



