
///////////////////////////////////////////////////////////////////////////////////////////////////
// Error and warning detection with debouncing and easy handling of multiple error conditions.
///////////////////////////////////////////////////////////////////////////////////////////////////
var Graphics = {

  // Styles
  hidePose : function() {
    $( "#pose" ).css( {"display":"none"} );
  },
  showPose : function() {
    $( "#pose" ).css( {"display":"block"} );

    var faceRect = $( "#faceRect" )[0];

    var x0 = 100;
    var y0 = 100;
    var dilationX = 0.2;
    var dilationY = 0.3;

    var face = xLabs.getConfig( "validation.facePosition" );
    var parts = face.split( "," );

    var fx = parseFloat( parts[ 0 ] );
    var fy = parseFloat( parts[ 1 ] );
    var fw = parseFloat( parts[ 2 ] );
    var fh = parseFloat( parts[ 3 ] );

    if( isNaN( fx ) || isNaN( fy ) || isNaN( fw ) || isNaN( fh ) ) {
      return;
    }

    var videoElement = document.getElementById( "xLabsPreview" );
    var videoRect = videoElement.getBoundingClientRect();

    var dx = fw * dilationX;
    var dy = fh * dilationY;

    fx = fx - dx;
    fy = fy - dy;
    fw = fw + (dx*2);    
    fh = fh + (dy*2);    
    fx = fx + videoRect.left;
    fy = fy + videoRect.top;

    faceRect.setAttribute( "x", fx );
    faceRect.setAttribute( "y", fy );
    faceRect.setAttribute( "width", fw );
    faceRect.setAttribute( "height", fh );

    var stroke = "rgba( 255,255,255,0.7 )"
    if( Errors.hasBadPose() ) {
      stroke = "rgba( 255,0,0,0.7 )";
    }

    faceRect.setAttribute( "stroke", stroke );
  },

  hideTarget : function() {
    $( "#target" ).css( {"display":"none"} );
  },
  showTarget : function() {
    $( "#target" ).css( {"display":"block"} );
    var idx = Targets.get();
    var xyScreen = Targets.getScreen( idx );
    var r = Targets.getRadius();
    var rHead = Targets.getRadiusHead();
    var xyHead = Targets.getScreenHead( idx );
    var xyPoint = Targets.getScreenPoint( idx );

    // center the target on the specified screen pos    
    $( "#bgCircle" )[0].setAttribute( "cx", xyScreen.x );
    $( "#bgCircle" )[0].setAttribute( "cy", xyScreen.y );
    $( "#cCircle" )[0].setAttribute( "cx", xyScreen.x );
    $( "#cCircle" )[0].setAttribute( "cy", xyScreen.y );

    $( "#bgCircle" )[0].setAttribute( "r", r );

    var stroke = "#555";
    if( Targets.headNearPoint() ) {
      stroke = "rgba( 0,100,0,0.7 )";
    }
    $( "#tCircle" )[0].setAttribute( "stroke", stroke );

    var xHide = -9000;
    var idx = Points.getIdx();
    if( idx == null ) {
      $( "#xCircle" )[0].setAttribute( "cx", xyScreen.x );
      $( "#xCircle" )[0].setAttribute( "cy", xyScreen.y );
      $( "#text" )[0].setAttribute( "x", xyScreen.x );
      $( "#text" )[0].setAttribute( "y", xyScreen.y );

      $( "#hCircle" )[0].setAttribute( "cx", xHide );
      $( "#tCircle" )[0].setAttribute( "cx", xHide );
    }
    else {
      $( "#xCircle" )[0].setAttribute( "cx", xHide );
      $( "#text" )[0].setAttribute( "x", xHide );

      $( "#hCircle" )[0].setAttribute( "cx", xyHead.x );
      $( "#hCircle" )[0].setAttribute( "cy", xyHead.y );
      $( "#hCircle" )[0].setAttribute( "r", rHead );

      $( "#tCircle" )[0].setAttribute( "cx", xyPoint.x );
      $( "#tCircle" )[0].setAttribute( "cy", xyPoint.y );
      $( "#tCircle" )[0].setAttribute( "r", rHead * 1.05 );

    }

/*     <path id="arc" fill="none" stroke="#000000" d="M 210 300 A 90 90 0 0 1 390 300"/>  
*/
  },


  hideMessage : function() {
    $( "#message" ).css( {"display":"none"} );
    $( "#button" ).css( {"display":"none"} );
  },

  showMessage : function( text, buttonText, isError ) {
    $( "#message" ).css( {"display":"block"} );
    $( "#message" )[0].innerHTML = text;

    if( buttonText != null ) {
      $( "#button" ).css( {"display":"block"} );
      $( "#button" )[0].value = buttonText;
    }
    else {
      $( "#button" ).css( {"display":"none"} );
    }

    if( isError ) {
      $( "#message" ).css( {"background-color":"#AA0000"} );
    }
    else {
      $( "#message" ).css( {"background-color":"#EEE"} );
    }
  }

};



