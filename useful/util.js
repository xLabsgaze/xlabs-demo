
var Util = {

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Painting Methods
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  drawCircle : function( centreX, centreY, radius ) {
    Canvas.context.beginPath();
    Canvas.context.arc( centreX, centreY, radius, 0, 2 * Math.PI, false );
    Canvas.context.stroke();
  },

  fillCircle : function( centreX, centreY, radius ) {
    Canvas.context.beginPath();
    Canvas.context.arc( centreX, centreY, radius, 0, 2 * Math.PI, false );
    Canvas.context.fill();
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Math / Geometry
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  randomInteger : function( intMin, intMax ) {
    var intRandom = ( Math.floor( Math.random() * ( intMax - intMin +1 ) ) + intMin );
    return intRandom;
  },

  lerp : function( oldValue, oneValue, learningRate ) {
    var beta = 1.0 - learningRate;
    var newValue = oldValue * beta + oneValue * learningRate;
    return newValue;
  },

  distance : function( x1, y1, x2, y2 ) {
    var dx2 = ( x1 - x2 ) * ( x1 - x2 );    
    var dy2 = ( y1 - y2 ) * ( y1 - y2 );
    var d = Math.sqrt( dx2 + dy2 );
    return d;
  },

  distanceThreshold : function( x1, y1, x2, y2, threshold ) {
    // if distance > threshold, then fail
    var d = Util.distance( x1, y1, x2, y2 );
    if( d < threshold ) {
      return true;
    }        
    return false;
  },

  rectangleDistance : function( x, y, rx, ry, rw, rh ) {
    // clamp point to rectangle and calculate distance to point
    var cx = Math.max( Math.min( x, rx+rw ), rx );
    var cy = Math.max( Math.min( y, ry+rh ), ry );
    return Math.sqrt( (x-cx) * (x-cx) + (y-cy) * (y-cy) );
  },

  rectangleInside : function( xp, yp, rx, ry, rw, rh ) { // NOTE: Arg order changed
    var x2 = rx + rw;
    var y2 = ry + rh;
    if( ( xp >= rx ) && ( yp >= ry ) && ( xp < x2 ) && ( yp < y2 ) ) {
      return true;
    }
    return false;
  },

  rotate : function( x, y, t ) {
    var cost = Math.cos( t );
    var sint = Math.sin( t );
    return {
        x: cost * ( x ) - sint * ( y ),
        y: sint * ( x ) + cost * ( y )
    };
  }

};



