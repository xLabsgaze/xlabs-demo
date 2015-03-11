
///////////////////////////////////////////////////////////////////////////////////////////////////
// Error and warning detection with debouncing and easy handling of multiple error conditions.
///////////////////////////////////////////////////////////////////////////////////////////////////
var Points = {

  POINT_DWELL_TIME : 800,
  POINT_VALUE_NG : 0,
  POINT_VALUE_OK : 1,

  // Variables
  nbrPoints : 0,
  idx : null,
  status : null, // array 1 * targetValues
  angles : null, // array 1 * targetValues

  timer : null,

  completedCallback : null,

  getIdx : function() {
    Points.check();
    return Points.idx;
  },

  getAngle : function( idx ) {
    Points.check();
    return Points.angles[ idx ];
  },

  setStatus : function( idx, status ) {
      Points.status[ idx ] = status;
  },

  getStatus : function( idx ) {
    Points.check();
    return Points.status[ idx ];
  },

  create : function() {
    if( Points.status != null ) {
      return;
    }

    Points.timer = new Timer();
    Points.timer.setDuration( Points.POINT_DWELL_TIME );

    Points.nbrPoints = 5;
    Points.status = new Array( Points.nbrPoints );
    Points.angles = new Array( Points.nbrPoints );

    var anglePerPoint = ( Math.PI * 2 ) / (Points.nbrPoints);

    for( var p = 0; p < Points.nbrPoints; ++p ) {
      var angle =  anglePerPoint * p;

      Points.angles[ p ] = angle;
    }

    Points.reset();
  }, 

  check : function() {
    Points.create();
  },

  reset : function() {
    Points.check();
    for( var p = 0; p < Points.nbrPoints; ++p ) {
      Points.status[ p ] = Points.POINT_VALUE_NG;
    }
    Points.clear();
  },

  clear : function() {
    Points.idx = null;
  },

  complete : function() {
    Points.check();
    for( var p = 0; p < Points.nbrPoints; ++p ) {
      var status = Points.status[ p  ];
      if( status != Points.POINT_VALUE_OK ) {
        return false;
      }
    }
    return true;
  },

  setNext : function() {
    Points.check();

    if( Points.idx != null ) {
      Points.setStatus( Points.idx, Points.POINT_VALUE_OK );
    }

    // search for an incomplete point:
    var next = 0;
    
    while( next < Points.nbrPoints ) {
      var status = Points.status[ next ];
      if( status != Points.POINT_VALUE_OK ) {
        break; // next is found
      }

      next = next +1;
    }

    Points.idx = next;

    if( Points.complete() ) {
      Points.onComplete();
    }
  },

  onComplete : function() {
    Points.check();
    if( Points.completedCallback != null ) {
      Points.completedCallback();
    }
    Points.reset();
  }

};



