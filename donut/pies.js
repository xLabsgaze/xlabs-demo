
///////////////////////////////////////////////////////////////////////////////////////////////////
// Error and warning detection with debouncing and easy handling of multiple error conditions.
///////////////////////////////////////////////////////////////////////////////////////////////////
var Pies = {

  // Constants
  PIE_INSET : 0.05,
  PIE_LOCATION_X_TO_Y_RATIO : 4/3,
  PIE_VALUES : 4,
  PIE_VALUE_DEFAULT : 0,
  PIE_VALUE_MOUSEOVER : 1,
  PIE_VALUE_MOUSEDOWN : 2,
  PIE_VALUE_VISITED : 1,

  PIE_SLICE_THRESHOLD : 6, // number of slices that must be SUCCESSFULLY visited (ie without error)
  SLICES : 8, // total number of slices
  SLICE_RADIANS_START : (-225 * Math.PI/180),
  SLICE_RADIANS_END   : (  45 * Math.PI/180),
  SLICE_INNER_RADIUS_FRAC_OF_HEIGHT : 0.03,// fraction of DPI scaled pie size
  SLICE_OUTER_RADIUS_FRAC_OF_HEIGHT : 0.09,// fraction of DPI scaled pie size

  SLICE_VALUE_DEFAULT : 0,
  SLICE_VALUE_VISITED : 1,
  SLICE_VALUE_ERROR   : 2,

  PIE_IMAGE_FILE : "donut.png",

  // Variables
  allPiesVisitedCallback : null,
  pieImage : null,
  nbrPies : 0,
  pie : 0,
  pies : null, // array x,y * pies
  pieStatus : null, // array 1 * pies
  slices : null, // array length SLICES, value is int  

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Mouse events
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  onMouseDown : function() {
    var x = Mouse.xMouseScreen;
    var y = Mouse.yMouseScreen;
    var p = Pies.getNearestPie( x, y );
    if( p < 0 ) { // no pie
      return;
    }

    //xLabs.setTruthEnabled( true );
    Head.reset();
    Pies.setCurrentPie( p ); // select this pie
    Pies.updatePieValue( x, y );
  },

  onMouseUp : function() {
    var x = Mouse.xMouseScreen;
    var y = Mouse.yMouseScreen;
    Pies.updatePieValue( x, y );
    Head.reset();

    //this.setRandomPie(); // select a new target randomly. The user doesn't have to click it tho
    if( Pies.isPieComplete() ) {
      Pies.setPieVisited();
      Pies.setNextPie();
      Pies.resetSlices();
    }

    //xLabs.setTruthEnabled( false );

    Pies.updatePieValue( x, y );

    // weirdly, because the javascript alert is modal, need to handle the error conditions LAST:
    var elapsed = Math.max( 0, Mouse.tMouseScreenUp - Mouse.tMouseScreenDown );
    var p = Pies.getNearestPie( x, y );
    if( p < 0 ) { // no pie
      alert( "You have to PRESS and HOLD the LEFT mouse button in the CENTRE of the donut" );
    }
    else if( elapsed < 150 ) { // didnt click long enough
      alert( "DON'T just CLICK: You have to PRESS and HOLD the LEFT mouse button in the CENTRE of the donut" );
    }
  },

  onMouseMove : function() {
    var x = Mouse.xMouseScreen;
    var y = Mouse.yMouseScreen;
    Pies.updatePieValue( x, y );
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Pie and Slice methods
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  allPiesVisited : function() {
    Pies.create();
    for( var p = 0; p < Pies.nbrPies; ++p ) {
      var visited = Pies.pies[ p * Pies.PIE_VALUES + 3 ];
      if( visited == Pies.PIE_VALUE_DEFAULT ) {
        return false;
      }
    }
    return true;
  },

  reset : function() {
    Pies.create();
    for( var p = 0; p < Pies.nbrPies; ++p ) {
      Pies.pies[ p * Pies.PIE_VALUES + 3 ] = Pies.PIE_VALUE_DEFAULT;
    }
    Pies.resetSlices();
  },

  updatePieValue : function( mouseScreenX, mouseScreenY ) {
    var p = Pies.getNearestPie( mouseScreenX, mouseScreenY );
//    if( p < 0 ) {
//      Pies.setPieValue( Pies.pie, Pies.PIE_VALUE_DEFAULT );
//      return; // no pie
//    } 
    if( p == Pies.pie ) { // selected pie
      if( Mouse.bMouseDown ) {
        Pies.setPieValue( Pies.pie, Pies.PIE_VALUE_MOUSEDOWN );
      }
      else {
        Pies.setPieValue( Pies.pie, Pies.PIE_VALUE_MOUSEOVER );
      }
    }
    else { // wrong pie, do nothing
      Pies.setPieValue( Pies.pie, Pies.PIE_VALUE_DEFAULT );
    }
  },

  getPieValue : function( p ) {
    Pies.create();
    if( ( p < 0 ) || ( p >= Pies.nbrPies ) ) {
      return Pies.PIE_VALUE_DEFAULT;
    }    
    return Pies.pies[ p * Pies.PIE_VALUES +2 ];
  },

  setPieValue : function( p, value ) {
    Pies.create();
    if( ( p < 0 ) || ( p >= Pies.nbrPies ) ) {
      return;
    }    
    Pies.pies[ p * Pies.PIE_VALUES +2 ] = value;
  },

  setPieVisited : function() {
    Pies.create();
    var p = Pies.pie;
    if( ( p < 0 ) || ( p >= Pies.nbrPies ) ) {
      return Pies.PIE_VALUE_DEFAULT;
    }    
    Pies.pies[ p * Pies.PIE_VALUES +3 ] = Pies.PIE_VALUE_VISITED;
  },

  isPieComplete : function() {
    var visited = 0;
    var error = 0;
    for( var i2 = 0; i2 < Pies.SLICES; ++i2 ) {
      var value = Pies.getSliceValue( i2 );
      if( value == Pies.SLICE_VALUE_DEFAULT ) { // not visited 
        return false; // at least attempt ALL
      }
      else if( value == Pies.SLICE_VALUE_VISITED ) {  
        visited = visited +1;
      }
      else if( value == Pies.SLICE_VALUE_ERROR ) {  
        error = error +1;
      }
      else {   // catch all, shouldn't happen
        visited = visited +1;
      }
    }

    if( visited > Pies.PIE_SLICE_THRESHOLD ) {
      return true;
    }
    return false;
  },

  resetSlices : function() {
    // console.log( "reset slices" );
    Pies.setSliceValues( Pies.SLICE_VALUE_DEFAULT );
  },

  getNearestPie : function( xScreen, yScreen ) {
    // console.log( "xScreen: " + xScreen );
    // console.log( "yScreen: " + yScreen );

    if( xLabs.documentOffsetReady() == false ) {
      return -1;
    }
    //var xy = xLabs.documentOffset();
    var xScreen2 = xLabs.scr2docX( xScreen );//xScreen - ( xy.x + window.screenX );
    var yScreen2 = xLabs.scr2docY( yScreen );//yScreen - ( xy.y + window.screenY );

    Pies.create();

    var pieCentreSizePixels = screen.height * Pies.SLICE_INNER_RADIUS_FRAC_OF_HEIGHT;


    for( var p = 0; p < Pies.nbrPies; ++p ) {
      var px = Pies.pies[ p * Pies.PIE_VALUES + 0 ];
      var py = Pies.pies[ p * Pies.PIE_VALUES + 1 ];
      px = xLabs.scr2docX( px );
      py = xLabs.scr2docY( py );

      //if( p == 0 ) console.log( "p,y x = "+px+","+py );
      var inPie = Util.distanceThreshold( px, py, xScreen2, yScreen2, pieCentreSizePixels );
      if( inPie ) {
        return p;
      }
    }
    return -1;
  },

  createSlices : function() {
    if( Pies.slices == null ) {
      Pies.slices = new Array( Pies.SLICES );
      for( var i2 = 0; i2 < Pies.SLICES; ++i2 ) {
        Pies.slices[ i2 ] = Pies.SLICE_VALUE_DEFAULT;
      }
    }
  },

  setSliceValues : function( value ) {
    Pies.createSlices();
    for( var i2 = 0; i2 < Pies.SLICES; ++i2 ) {
      Pies.slices[ i2 ] = value;
    }
  },

  setSliceValue : function( i, value ) {
    Pies.createSlices();
    if( ( i < 0 ) || ( i >= Pies.SLICES ) ) {
      return;
    }    
    Pies.slices[ i ] = value;
  },

  getSliceValue : function( i ) {
    Pies.createSlices();
    if( ( i < 0 ) || ( i >= Pies.SLICES ) ) {
      return 0;
    }    
    return( Pies.slices[ i ] );
  },

  setCurrentPie : function( newPie ) {
    if( this.pie != newPie ) {
      this.resetSlices();
      this.pie = newPie;
    }
  },

  setNextPie : function() {
    Pies.create();
    var nextPie = Pies.pie +1;
    if( nextPie >= Pies.nbrPies ) {
      nextPie = 0;
    }

    //this.pie = nextPie;
    Pies.setCurrentPie( nextPie );

    if( Pies.allPiesVisited() ) {
      Pies.allPiesVisitedCallback();
    }
  },

  allPiesVisitedCallback : function() {
    // todo callback
    if( Pies.allPiesVisitedCallback != null ) {
      Pies.allPiesVisitedCallback();
    }
  },
 
  setRandomPie : function() {
    Pies.create();
    // this.pie = this.getRandomInteger( 0, this.nbrPies-1 );
    this.setCurrentPie( this.getRandomInteger( 0, this.nbrPies-1 ) );
  },

  check : function() {
    // catch error where somehow no pies are active, and fix it:
    if( ( Pies.pie < 0 ) || ( Pies.pie >= Pies.nbrPies ) ) {
      Pies.setNextPie();
    }
  },

  create : function() {
    if( Pies.pies != null ) {
      Pies.check();
      return;
    }
    if( xLabs.documentOffsetReady() == false ) {
      return;
    }

    var w = screen.width;  //screen.width;
    var h = screen.height; //screen.height;

    var pieRadiusPixels = screen.height * Pies.SLICE_OUTER_RADIUS_FRAC_OF_HEIGHT;
    var insetY = Pies.PIE_INSET * h;
    var insetX = Math.max( insetY, ( w - (h - insetY*2) * Pies.PIE_LOCATION_X_TO_Y_RATIO ) / 2 ); // Enforce aspect ratio

    // All in screen coordinates
    var xyOffset = xLabs.documentOffset();

    var top   =     insetY + xyOffset.y; // insetY in document coordinates, to appear below the toolbar
    var bot   = h - insetY; // insetY in screen coordinates, to be visible above the bottom of screen
    var left  =     insetX;
    var right = w - insetX;

    // Add the pie radius
    top   += pieRadiusPixels;
    bot   -= pieRadiusPixels;
    left  += pieRadiusPixels;
    right -= pieRadiusPixels;

    // Pie centres are in screen coordinates
    var p = 0;
    Pies.nbrPies = 5;
    Pies.pies = new Array( Pies.nbrPies * Pies.PIE_VALUES );
    Pies.pieStatus = new Array( Pies.nbrPies * Pies.PIE_VALUES );
    Pies.pies[ p * Pies.PIE_VALUES + 0 ] = left;
    Pies.pies[ p * Pies.PIE_VALUES + 1 ] = top; 
    Pies.pies[ p * Pies.PIE_VALUES + 2 ] = Pies.PIE_VALUE_DEFAULT; 
    Pies.pies[ p * Pies.PIE_VALUES + 3 ] = Pies.PIE_VALUE_DEFAULT; 
    p = p +1;
    Pies.pies[ p * Pies.PIE_VALUES + 0 ] = right;
    Pies.pies[ p * Pies.PIE_VALUES + 1 ] = top; 
    Pies.pies[ p * Pies.PIE_VALUES + 2 ] = Pies.PIE_VALUE_DEFAULT; 
    Pies.pies[ p * Pies.PIE_VALUES + 3 ] = Pies.PIE_VALUE_DEFAULT; 
    p = p +1;
    Pies.pies[ p * Pies.PIE_VALUES + 0 ] = left;
    Pies.pies[ p * Pies.PIE_VALUES + 1 ] = bot; 
    Pies.pies[ p * Pies.PIE_VALUES + 2 ] = Pies.PIE_VALUE_DEFAULT; 
    Pies.pies[ p * Pies.PIE_VALUES + 3 ] = Pies.PIE_VALUE_DEFAULT; 
    p = p +1;
    Pies.pies[ p * Pies.PIE_VALUES + 0 ] = right;
    Pies.pies[ p * Pies.PIE_VALUES + 1 ] = bot; 
    Pies.pies[ p * Pies.PIE_VALUES + 2 ] = Pies.PIE_VALUE_DEFAULT; 
    Pies.pies[ p * Pies.PIE_VALUES + 3 ] = Pies.PIE_VALUE_DEFAULT; 
    p = p +1;
    Pies.pies[ p * Pies.PIE_VALUES + 0 ] = w/2;
    Pies.pies[ p * Pies.PIE_VALUES + 1 ] = h/2; 
    Pies.pies[ p * Pies.PIE_VALUES + 2 ] = Pies.PIE_VALUE_DEFAULT; 
    Pies.pies[ p * Pies.PIE_VALUES + 3 ] = Pies.PIE_VALUE_DEFAULT; 

    Pies.check();
  },

};



