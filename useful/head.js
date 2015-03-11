
///////////////////////////////////////////////////////////////////////////////
// Interactive calibration mode: You play a game to get some detailed 
// calibration data.
///////////////////////////////////////////////////////////////////////////////
var Head = {

  // Parameters
  HEAD_LEARNING_RATE : 0.2,
  HEAD_ORIGIN_LEARNING_RATE : 0.0,
  HEAD_TRACK_X_SCALE : 300.0,//600.0,//400.0,
  HEAD_TRACK_Y_SCALE : 400.0,//800.0,
  HEAD_TRACK_MAX_DELTA : 100.0,

  // Head  
  xScale : 200.0,
  yScale : 350.0,
  xHeadOrigin : null,
  yHeadOrigin : null,
  xHead : null,
  yHead : null,

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Head tracker
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  reset : function() {
    Head.xHeadOrigin = null;
    Head.yHeadOrigin = null;
    Head.xHead = null;
    Head.yHead = null;
  },

  update : function() {
    // if not set, then copy:
    var x = parseFloat( xLabs.getConfig( "state.head.x" ) );
    var y = parseFloat( xLabs.getConfig( "state.head.y" ) );

    if( Head.xHeadOrigin == null ) {
      Head.xHeadOrigin = x;
      Head.yHeadOrigin = y;
      Head.xHead       = x;
      Head.yHead       = y;
    }

    // Smoothed update
    var offset = 50.0; // shift to positive range
    Head.xHead = Util.lerp( Head.xHead+offset, x+offset, Head.HEAD_LEARNING_RATE ) -offset;
    Head.yHead = Util.lerp( Head.yHead+offset, y+offset, Head.HEAD_LEARNING_RATE ) -offset;

    Head.xHeadOrigin = Util.lerp( Head.xHeadOrigin+offset, x+offset, Head.HEAD_ORIGIN_LEARNING_RATE ) -offset;
    Head.yHeadOrigin = Util.lerp( Head.yHeadOrigin+offset, y+offset, Head.HEAD_ORIGIN_LEARNING_RATE ) -offset;
  },

  get : function() {
    var dx = - (Head.xHead - Head.xHeadOrigin) * Head.xScale;
    var dy = + (Head.yHead - Head.yHeadOrigin) * Head.yScale; // to pixels

    dx = Math.min( Head.HEAD_TRACK_MAX_DELTA, Math.max( -Head.HEAD_TRACK_MAX_DELTA, dx ) );
    dy = Math.min( Head.HEAD_TRACK_MAX_DELTA, Math.max( -Head.HEAD_TRACK_MAX_DELTA, dy ) );

    var coordinate = { x:dx, y:dy }; 
    return coordinate;
  },


};


