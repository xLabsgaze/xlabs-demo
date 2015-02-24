
///////////////////////////////////////////////////////////////////////////////
// Interactive calibration mode: You play a game to get some detailed 
// calibration data.
///////////////////////////////////////////////////////////////////////////////
var Path = {

  LENGTH_SECONDS : 40,//6,//40,
  TARGET_SIZE : 20,  
  WINDOW_SIZE : 200,  

  timePaused  : 0,
  timeLast    : 0,
  timeElapsed : 0,

  // Path
  pathLength : 0, 
  pathPoints : null,
  hazards : null,
  hazardsLength : 0,
  stylePath : "rgba( 127, 127, 127, 1.0 )",

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Path-Document Transform Methods
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  path2docX : function( pathX ) {
    // everything expressed as a fraction of height to preserve proportions
    // proportions are 4:3 centred.
    var h = Canvas.element.height; //screen.height;
    var w = Canvas.element.width;  //screen.width;
    var scaling43 = 1.33333333; // = 1 / (3/4);
    var width43 = h * scaling43;
    var radius43 = width43 * 0.5;
    var centre = w * 0.5;
    var origin = centre -radius43;
    var docX = origin + width43 * pathX;
    return docX;
  },

  path2docY : function( pathY ) {
    // everything expressed as a fraction of height to preserve proportions
    // proportions are 4:3 centred.
    var h = Canvas.element.height; //screen.height;
    var docY = h * pathY;
    return docY;
  },

  getTargetSize : function() {
    return Path.TARGET_SIZE;
  },
  getWindowSize : function() {
    return Path.WINDOW_SIZE;
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Path timer methods
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  timeReset : function() {
//console.log( "time reset " );
    var time = new Date().getTime();
    Path.timeElapsed = 0;
    Path.timeLast = time;
  },

  timeUpdate : function() {
//console.log( "time update " );
    var time = new Date().getTime();
    var elapsed = time - Path.timeLast;
    if( Path.timePaused == 0 ) {
      Path.timeElapsed += elapsed;
    }
    Path.timeLast = time;
  },

  timePause : function() {
    Path.timePaused = 1;
  },

  timeResume : function() {
    Path.timePaused = 0;
  },

  timeGet : function() {
    return Path.timeElapsed;
  },
  timeFrac : function() {
    return Path.timeElapsed / ( Path.LENGTH_SECONDS * 1000 );
  },
  complete : function() {
    return( Path.timeElapsed > ( Path.LENGTH_SECONDS * 1000 ) );
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Path position / coordinate methods
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  hazardAdd : function ( p, x, y ) {
    Path.hazards[ p * 2 + 0 ] = x;
    Path.hazards[ p * 2 + 1 ] = y;    
    p = p + 1;
    return p;
  },

  getPosition : function() {
    var pathLength = Path.getLength();
    var time = Path.timeFrac();
    var pathPosition = pathLength * time;
    return pathPosition;
  },

  getCoordinateStart : function() {
    var p = 0;
    return Path.getCoordinateIndex( p );
  },
  getCoordinateEnd : function() {
    var p = Path.pathLength -1;
    return Path.getCoordinateIndex( p );
  },
  getCoordinateIndex : function( p ) {
    var x = 0;
    var y = 1;
    var pathX = Path.pathPoints[ p * 2 + x ];
    var pathY = Path.pathPoints[ p * 2 + y ];
    var coordinate = { x:pathX, y:pathY }; 
    return coordinate;
  },

  getCoordinate : function() {
    var time = Path.timeFrac();
    return Path.getCoordinateTime( time );
  },

  getCoordinateTime : function( time ) {
    var pathLength = Path.getLength();
    var pathPosition = pathLength * time;

    var x = 0;
    var y = 1;
    var p = 0;
    var x1 = 0;
    var y1 = 0;
    var x2 = Path.pathPoints[ p * 2 + x ];
    var y2 = Path.pathPoints[ p * 2 + y ];

    var pathX = 0;
    var pathY = 0;
    var pathT = 0;
    var pathSum1 = 0;

    for( p = 1; p < Path.pathLength; ++p ) {
      x1 = x2;
      y1 = y2;
      x2 = Path.pathPoints[ p * 2 + x ];
      y2 = Path.pathPoints[ p * 2 + y ];
      
      var dx = x2 - x1;
      var dy = y2 - y1; 
      var d = Math.abs( dx ) + Math.abs( dy ); // NOTE: only works for horz or vert lines
          
      var pathSum2 = pathSum1 + d;
      if(    ( pathSum1 <= pathPosition ) 
          && ( pathSum2 >= pathPosition ) ) {
        var segmentPosition = pathPosition - pathSum1;
        var segmentLength = d;
        var segmentFrac = segmentPosition / segmentLength;

        pathX = x1 + segmentFrac * dx;
        pathY = y1 + segmentFrac * dy;

        if( Math.abs( dx ) == 0 ) {
          pathT = 1;
        }

        break;
      }

      pathSum1 = pathSum2;
    }

    var coordinate = { x:pathX, y:pathY, t:pathT }; 
    return coordinate;
  },

  getLength : function() {
    var x = 0;
    var y = 1;
    var p = 0;
    var x1 = 0;
    var y1 = 0;
    var x2 = Path.pathPoints[ p * 2 + x ];
    var y2 = Path.pathPoints[ p * 2 + y ];

    var pathLength = 0;

    for( p = 1; p < Path.pathLength; ++p ) {
      x1 = x2;
      y1 = y2;
      x2 = Path.pathPoints[ p * 2 + x ];
      y2 = Path.pathPoints[ p * 2 + y ];
      
      var dx = Math.abs( x2 - x1 );
      var dy = Math.abs( y2 - y1 ); 
      var d = dx + dy; // NOTE: only works for horz or vert lines
          
      pathLength = pathLength + d;
//console.log( "path len="+pathLength );
    }

    return pathLength;    
  },

  startInside : function() {
    return false;
  },

  getHeadScreenCoordinate : function() {
    var cHead = Head.get();
    var cNow  = Path.getCoordinate();

    var dx = cHead.x; // TODO fix this
    var dy = cHead.y;

    var xDoc = Path.path2docX( cNow.x );
    var yDoc = Path.path2docY( cNow.y );
    var xScr = xLabs.scr2docX( xDoc +dx );
    var yScr = xLabs.scr2docY( yDoc +dy );

    //console.log( "truth.x  "+xScr+" y="+yScr );
    var c = { x: xScr, y: yScr };
    return c;
  },

  paint : function() {
    Canvas.context.beginPath();
    Canvas.context.lineWidth = "1";
    Canvas.context.strokeStyle = Path.stylePath;
    var x = 0;
    var y = 1;
    var p = 0;
    var x1 = 0;
    var y1 = 0;
    var x2 = 0;
    var y2 = 0;
    var xPath = Path.pathPoints[ p * 2 + x ];
    var yPath = Path.pathPoints[ p * 2 + y ];
    var xDoc = Path.path2docX( xPath );
    var yDoc = Path.path2docY( yPath );
    var xScr = xLabs.scr2docX( xDoc );
    var yScr = xLabs.scr2docY( yDoc );

    x2 = xScr;
    y2 = yScr;

    Canvas.context.moveTo( x2,y2 );

    //var pathLength = 0;

    for( p = 1; p < Path.pathLength; ++p ) {
      xPath = Path.pathPoints[ p * 2 + x ];
      yPath = Path.pathPoints[ p * 2 + y ];
      xDoc = Path.path2docX( xPath );
      yDoc = Path.path2docY( yPath );
      xScr = xLabs.scr2docX( xDoc );
      yScr = xLabs.scr2docY( yDoc );
//console.log( "path x,y="+xPath+","+yPath +" xDoc= "+xDoc+","+yDoc+" xScr="+ xScr+","+yScr );
      x1 = x2;
      y1 = y2;
      x2 = xScr;
      y2 = yScr;
      
      Canvas.context.lineTo( x2,y2 );
    }

    Canvas.context.stroke(); // Draw it
  },  

  hazardPaint : function() {
// TODO make optional
//var styleHazard = "rgba( 250, 200, 200, 0.5 )";
//var styleHazardLine = "rgba( 250, 200, 200, 1.0 )";

    var radius = Path.getTargetSize();
    Canvas.context.lineWidth = "1";
    Canvas.context.fillStyle = Paint.styleHazard;
    Canvas.context.strokeStyle = Paint.styleHazardLine;

    var x = 0;
    var y = 1;

    for( p = 0; p < Path.hazardsLength; ++p ) {
      xPath = Path.hazards[ p * 2 + x ]; // path time value
      yPath = Path.hazards[ p * 2 + y ]; // path offset value (positional)

      var c = Path.getCoordinateTime( xPath );

      var xDoc1 = Path.path2docX( c.x );
      var yDoc1 = Path.path2docY( c.y );
      var xScr1 = xLabs.scr2docX( xDoc1 );
      var yScr1 = xLabs.scr2docY( yDoc1 );

      if( c.t == 0 ) {
        c.y += yPath;
      }
      else {
        c.x += yPath;
      }

      var xDoc2 = Path.path2docX( c.x );
      var yDoc2 = Path.path2docY( c.y );
      var xScr2 = xLabs.scr2docX( xDoc2 );
      var yScr2 = xLabs.scr2docY( yDoc2 );

      // a line linking the two points
      Canvas.context.beginPath(); 
      Canvas.context.moveTo( xScr1, yScr1 );
      Canvas.context.lineTo( xScr2, yScr2 );
      Canvas.context.stroke(); // Draw it

      Util.fillCircle( xScr2, yScr2, radius );
    }
  },

  hazardGetCollision : function() {
    //var time = Path.timeFrac();
    var cNow  = Path.getCoordinate();
    var cHead = Head.get();
    
    var xDoc1 = Path.path2docX( cNow.x );
    var yDoc1 = Path.path2docY( cNow.y );
    var xScr1 = xLabs.scr2docX( xDoc1 );
    var yScr1 = xLabs.scr2docY( yDoc1 );

    xScr1 = xScr1 + cHead.x;
    yScr1 = yScr1 + cHead.y;

    var radius = Path.getTargetSize();
    var x = 0;
    var y = 1;

    for( p = 0; p < Path.hazardsLength; ++p ) {
      xPath = Path.hazards[ p * 2 + x ]; // path time value
      yPath = Path.hazards[ p * 2 + y ]; // path offset value (positional)

      var c = Path.getCoordinateTime( xPath );
      if( c.t == 0 ) {
        c.y += yPath;
      }
      else {
        c.x += yPath;
      }

      var xDoc2 = Path.path2docX( c.x );
      var yDoc2 = Path.path2docY( c.y );
      var xScr2 = xLabs.scr2docX( xDoc2 );
      var yScr2 = xLabs.scr2docY( yDoc2 );

      var d = Util.distance( xScr1, yScr1, xScr2, yScr2 );
//console.log( "d="+d );
      if( d < ( radius * 2.0 ) ) {
        return p;
      }
    }

    return -1;
  },

  setup : function() {
    // path points are expressed as a fraction of the unit 4:3 ratio centred box, origin top-left.
    Path.pathLength = 6; 
    Path.pathPoints = new Float32Array( 2 * Path.pathLength );

    var insetX = 0.1;
    var insetY1 = 0.2;
    var insetY2 = 0.15;
    var x = 0;
    var y = 1;
    var p = 0;
    Path.pathPoints[ p * 2 + x ] = 0.5;
    Path.pathPoints[ p * 2 + y ] = 0.5;    
    p = p + 1;
    Path.pathPoints[ p * 2 + x ] = 1.0-insetX;
    Path.pathPoints[ p * 2 + y ] = 0.5;    
    p = p + 1;
    Path.pathPoints[ p * 2 + x ] = 1.0-insetX;
    Path.pathPoints[ p * 2 + y ] = insetY1;    
    p = p + 1;
    Path.pathPoints[ p * 2 + x ] = insetX;
    Path.pathPoints[ p * 2 + y ] = insetY1;    
    p = p + 1;
    Path.pathPoints[ p * 2 + x ] = insetX;
    Path.pathPoints[ p * 2 + y ] = 1.0-insetY2;    
    p = p + 1;
    Path.pathPoints[ p * 2 + x ] = 1.0-insetX;
    Path.pathPoints[ p * 2 + y ] = 1.0-insetY2;    

    Path.hazardsLength = 10; 
    Path.hazards = new Float32Array( 2 * Path.hazardsLength );

    p = 0;
    p = Path.hazardAdd( p, 0.05, -0.0 );
    p = Path.hazardAdd( p, 0.1, 0.02 );
    p = Path.hazardAdd( p, 0.2, 0.03 );
    p = Path.hazardAdd( p, 0.25, 0.0 );
    p = Path.hazardAdd( p, 0.4, 0.02 );
    p = Path.hazardAdd( p, 0.5, 0.0 );
    p = Path.hazardAdd( p, 0.6, -0.02 );
    p = Path.hazardAdd( p, 0.67, 0.0 );
    p = Path.hazardAdd( p, 0.8, 0.02 );
    p = Path.hazardAdd( p, 0.9, -0.02 );

    Path.timePause();
  }

};


