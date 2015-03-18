
///////////////////////////////////////////////////////////////////////////////////////////////////
// Error and warning detection with debouncing and easy handling of multiple error conditions.
///////////////////////////////////////////////////////////////////////////////////////////////////
var Targets = {

  // Constants
  INSET : 0.05,
  LOCATION_X_TO_Y_RATIO : 4/3,
  RADIUS_FRAC_OF_HEIGHT : 0.09,// fraction of DPI scaled pie size
  TOP_INSET_FRAC_OF_HEIGHT : 0.13,// fraction of DPI scaled pie size
  BOTTOM_INSET_FRAC_OF_HEIGHT : 0.2,// fraction of DPI scaled pie size
  HEAD_FRAC_OF_HEIGHT : 0.03,// fraction of DPI scaled pie size
  HEAD_DISTANCE_THRESHOLD : 1.2, //0.8,
  HEAD_DISTANCE_FACTOR : 5.0,//3.0,//1.5,

  TARGET_VALUE_DEFAULT : 0,
  TARGET_VALUE_MOUSEOVER : 1,
  TARGET_VALUE_MOUSEDOWN : 2,
  TARGET_VALUE_VISITED : 3,

  // Variables
  completedCallback : null,

  nbrTargets : 0,
  idxTarget : 0,
  targetValues : null, // array x,y * targetValues
  targetStatus : null, // array 1 * targetValues

  get : function() {
    return Targets.idxTarget;
  },

  setStatus : function( idx, status ) {
    Targets.targetStatus[ idx ] = status;
  },
  getStatus : function( idx ) {
    return Targets.targetStatus[ idx ];
  },

  getScreen : function( idx ) {
    var xFrac = Targets.targetValues[ idx * 2 +0 ];
    var yFrac = Targets.targetValues[ idx * 2 +1 ];

    var xyOffset = xLabs.documentOffset();
    
    var xRel = ( screen.height * ( xFrac -0.5 ) );

    var x = ( screen.width * 0.5 ) + xRel -( xyOffset.x + window.screenX );
    var y = 0;
    var rTop    = Targets.getTopInset();
    var rBottom = Targets.getBottomInset();
    
    // push the targets to fit within the visible area of screen.
    if( yFrac < 0.3 ) {
      y = rTop +xyOffset.y - ( xyOffset.y + window.screenY );//window.screenY + xyOffset.y
    }
    else if( yFrac > 0.7 ) {
      y =              screen.height * yFrac          -( xyOffset.y + window.screenY );
      y = Math.min( y, screen.height         -rBottom -( xyOffset.y + window.screenY ) );
    }
    else { // centre
      y = screen.height * yFrac    -( xyOffset.y + window.screenY );
    }

    return { x: x, y: y };
  },

  getTopInset : function( idx ) {
    var r = screen.height * Targets.TOP_INSET_FRAC_OF_HEIGHT;
    return r;
  },
  
  getBottomInset : function( idx ) {
    var r = screen.height * Targets.BOTTOM_INSET_FRAC_OF_HEIGHT;
    return r;
  },

  getRadius : function( idx ) {
    var r = screen.height * Targets.RADIUS_FRAC_OF_HEIGHT;
    return r;
  },
  getRadiusHead : function() {
    var r = screen.height * Targets.HEAD_FRAC_OF_HEIGHT;
    return r;
  },
  getScreenHead : function( idx ) {
    var xyTarget = Targets.getScreen( idx );
    var xyHead = Head.get();

    xyHead.x = xyHead.x * Targets.HEAD_DISTANCE_FACTOR;
    xyHead.y = xyHead.y * Targets.HEAD_DISTANCE_FACTOR;

    var x = xyTarget.x + xyHead.x;
    var y = xyTarget.y + xyHead.y;

    return { x: x, y: y };
  },
  getScreenPoint : function( idx ) {
    var xyTarget = Targets.getScreen( idx );
    var r = Targets.getRadius();

    var t = Points.getAngle( Points.getIdx() );
    var xyPoint = Util.rotate( r, 0, t ); // x,y,t

    var x = xyTarget.x + xyPoint.x;
    var y = xyTarget.y + xyPoint.y;
    return { x: x, y: y };
  },

  headNearPoint : function() {
    var idx = Targets.idxTarget;
    var xyHead = Targets.getScreenHead( idx );
    var xyPoint = Targets.getScreenPoint( idx );
    var t = Targets.getRadiusHead() * Targets.HEAD_DISTANCE_THRESHOLD;
    return Util.distanceThreshold( xyHead.x, xyHead.y, xyPoint.x, xyPoint.y, t );
  },

  update : function() {
    // is there an active point?
    // If not, wait for click
    var idx = Points.getIdx();
    if( idx == null ) {
      return;
    }

    // TODO: Detect errors indicating loss of attention or failure to understand the task.

    // See if we're hitting the target
    if( !Targets.headNearPoint() ) {
//console.log( "reset timer, not near" );
      Points.timer.reset();
    }
    
    if( Points.timer.hasElapsed() ) {
      Points.setNext();
    }
  },

  create : function() {
    if( Targets.targetValues != null ) {
      return;
    }
    if( xLabs.documentOffsetReady() == false ) {
      return;
    }

    Points.completedCallback = Targets.onPointsCompleted;

    var insetY = Targets.INSET;

    // All in screen coordinates
    var top   = insetY;
    var bot   = 1.0 - insetY;
    var left  = top;
    var right = bot;

    // Pie centres, as a fraction of screen
    var p = 0;
    Targets.nbrTargets = 5;
    Targets.targetValues = new Array( Targets.nbrTargets * 2 );
    Targets.targetStatus = new Array( Targets.nbrTargets * 1 );

    Targets.targetValues[ p * 2 + 0 ] = left;
    Targets.targetValues[ p * 2 + 1 ] = top; 
    Targets.targetStatus[ p * 1 + 0 ] = Targets.TARGET_VALUE_DEFAULT;
    p = p +1;
    Targets.targetValues[ p * 2 + 0 ] = right;
    Targets.targetValues[ p * 2 + 1 ] = top; 
    Targets.targetValues[ p * 2 + 2 ] = Targets.TARGET_VALUE_DEFAULT; 
    Targets.targetStatus[ p * 1 + 0 ] = Targets.TARGET_VALUE_DEFAULT;
    p = p +1;
    Targets.targetValues[ p * 2 + 0 ] = left;
    Targets.targetValues[ p * 2 + 1 ] = bot; 
    Targets.targetStatus[ p * 1 + 0 ] = Targets.TARGET_VALUE_DEFAULT;
    p = p +1;
    Targets.targetValues[ p * 2 + 0 ] = right;
    Targets.targetValues[ p * 2 + 1 ] = bot; 
    Targets.targetStatus[ p * 1 + 0 ] = Targets.TARGET_VALUE_DEFAULT;
    p = p +1;
    Targets.targetValues[ p * 2 + 0 ] = 0.5;
    Targets.targetValues[ p * 2 + 1 ] = 0.5; 
    Targets.targetStatus[ p * 1 + 0 ] = Targets.TARGET_VALUE_DEFAULT;

    Targets.check();
  }, 

  check : function() {
    // catch error where somehow no targetValues are active, and fix it:
    Targets.create();

    if( ( Targets.idxTarget < 0 ) || ( Targets.idxTarget >= Targets.nbrTargets ) ) {
      Targets.setNext();
    }
  },

  reset : function() {
    Targets.check();
    for( var p = 0; p < Targets.nbrTargets; ++p ) {
      Targets.targetStatus[ p ] = Targets.TARGET_VALUE_DEFAULT;
    }

    Points.reset();
  },

  complete : function() {
    Targets.check();
    for( var p = 0; p < Targets.nbrTargets; ++p ) {
      var status = Targets.targetStatus[ p  ];
      if( status != Targets.TARGET_VALUE_VISITED ) {
        return false;
      }
    }
    return true;
  },

  setNext : function() {
    Targets.check();
    Targets.targetStatus[ Targets.idxTarget ] = Targets.TARGET_VALUE_VISITED;

    var nextTarget = Targets.idxTarget +1;
    if( nextTarget >= Targets.nbrTargets ) {
      nextTarget = 0;
    }

    Targets.idxTarget = nextTarget;

    Points.reset();
    Points.timer.reset();

    if( Targets.complete() ) {
      Targets.onComplete();
    }
  },

  onPointsCompleted : function() {
    Targets.setNext();   
  },

  onComplete : function() {
    if( Targets.completedCallback != null ) {
      Targets.completedCallback();
    }
  },

};



