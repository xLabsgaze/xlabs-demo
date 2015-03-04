
///////////////////////////////////////////////////////////////////////////////////////////////////
// Error and warning detection with debouncing and easy handling of multiple error conditions.
///////////////////////////////////////////////////////////////////////////////////////////////////
var Paint = {

  // Styles
  FONT_SIZE : 32,
  BACKGROUND_STYLE : "rgba( 255, 255, 255, 1.0 )",

  // Buttons
  BUTTON_X : 0.5,
  BUTTON_Y : 0.6,
  BUTTON_W : 0.17,
  BUTTON_H : 0.05,

  // Pose
  poseCheckX : true,
  poseCheckY : true,

  // Head painting
  HEAD_TRACK_FILL_SIZE  : 18,
  HEAD_TRACK_STROKE_SIZE : 20,
  HEAD_TRACK_X_SCALE_FRAC_OF_HEIGHT : 0.4,
  HEAD_TRACK_Y_SCALE_FRAC_OF_HEIGHT : 0.5,

  // Image assets
  ROTATE_IMAGE_FILE : "rotate.jpg",
  ROTATE_COLS : 5,
  ROTATE_ROWS : 13,

  rotateIndex : 0,
  rotateImage : null,

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Head rotation animation
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  getRotateFrac : function() {
    var maxIndex = Paint.ROTATE_COLS * Paint.ROTATE_ROWS;
    var indexFrac = Paint.rotateIndex / maxIndex;
    return indexFrac;
  },
  getRotateAngle : function() {
    var angle = -Paint.getRotateFrac() * Math.PI * 2.0;  // 0 to 2 pi
    return angle;
  },
  getRotatePoint : function() {
    var angle = Paint.getRotateAngle();
    var pieRadiusPixels = screen.height * Pies.SLICE_OUTER_RADIUS_FRAC_OF_HEIGHT * 0.7;

    var x = pieRadiusPixels;
    var y = 0.0;
    return {
        x: Math.cos(angle) * (x) - Math.sin(angle) * (y),
        y: Math.sin(angle) * (x) + Math.cos(angle) * (y)
    };
  },
  setRotateVisit : function() {
    var angle = Paint.getRotateAngle();

    if( angle < ( -Math.PI * 1.5 ) ) {
      angle = angle + Math.PI * 2.0;
    }

    var radiansPerSlice = (Pies.SLICE_RADIANS_END - Pies.SLICE_RADIANS_START) / Pies.SLICES;
    var sliceVisited = false;

    for( var i = 0; i < Pies.SLICES; ++i ) {
      // check angle bounds
      var th0 = (i  ) * radiansPerSlice + Pies.SLICE_RADIANS_START;
      var th1 = (i+1) * radiansPerSlice + Pies.SLICE_RADIANS_START; 
      var thMid = (th0+th1) * 0.5;
      var dth = Math.abs( angle - thMid ); // distance from slice midpoint angle
      if( dth < (radiansPerSlice*0.5) ) {
        Pies.setSliceValue( i, Pies.SLICE_VALUE_VISITED );
        sliceVisited = true;
      }
    }

    if( sliceVisited == false ) {
      Pies.resetSlices();
    }
  },
  
  paintRotateImage : function( x, y, size ) {
    if( Paint.rotateImage == null ) {
      var imageUrl = Paint.ROTATE_IMAGE_FILE;
      Paint.rotateImage = new Image;
      Paint.rotateImage.src = imageUrl;
    }

    var xImage = x - (size * 0.5);
    var yImage = y  -(size * 0.5);

    var xOrigin = 1;
    var yOrigin = 0;
    var xStride = 203;
    var yStride = 217;
    var wCrop = 184;
    var hCrop = 207;
    var xIndex = Paint.rotateIndex % Paint.ROTATE_COLS;
    var yIndex = Math.floor( Paint.rotateIndex / Paint.ROTATE_COLS );
    var maxIndex = Paint.ROTATE_COLS * Paint.ROTATE_ROWS;
    var xCrop = xOrigin + xIndex * xStride;
    var yCrop = yOrigin + yIndex * yStride;

    Canvas.context.drawImage( Paint.rotateImage, 
      xCrop, yCrop, wCrop, hCrop,//, size, size );
      xImage, yImage, size, size );

    // reset animation:
    Paint.rotateIndex = Paint.rotateIndex +1;
    if( Paint.rotateIndex >= maxIndex ) {
      Paint.rotateIndex = 0;
    }
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Pie slices
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  paintPieImage : function( x, y, size ) {
    if( Pies.pieImage == null ) {
      var imageUrl = Pies.PIE_IMAGE_FILE;
      Pies.pieImage = new Image;
      Pies.pieImage.src = imageUrl;
    }

    // TODO scale donuts to constant size.

    var xImage = x - (size * 0.5);
    var yImage = y  -(size * 0.5);

    // TODO make sure the pies arent partially hidden by an excess of toolbars? But you could always go fullscreen...

    Canvas.context.drawImage( Pies.pieImage, xImage, yImage, size, size );
  },

  paintPies : function() {
    Pies.create(); // lazy

    // done in pies.check()    
    // catch error where somehow no pies are active, and fix it:
    //if( ( Pies.pie < 0 ) || ( Pies.pie >= Pies.nbrPies ) ) {
    //  Pies.setNextPie();
    //}

    for( var p = 0; p < Pies.nbrPies; ++p ) {
      var px = Pies.pies[ p * Pies.PIE_VALUES + 0 ];
      var py = Pies.pies[ p * Pies.PIE_VALUES + 1 ];
      var value = Pies.pies[ p * Pies.PIE_VALUES + 2 ];
      var visited = Pies.pies[ p * Pies.PIE_VALUES + 3 ]; 
      var active = false;
      if( p == Pies.pie ) {
        active = true;
      }
      //console.log( "pie="+p+" active="+active+" value="+value );
      Paint.paintPie( px, py, active, value, visited );
    }
  },

  drawPie : function( centreX, centreY, radius, staRad, endRad ) {
    Canvas.context.beginPath();
    Canvas.context.arc( centreX, centreY, radius, staRad, endRad, false );
    Canvas.context.stroke();
  },
  
  fillPie : function( centreX, centreY, radius, staRad, endRad ) {
    Canvas.context.beginPath();
    Canvas.context.arc( centreX, centreY, radius, staRad, endRad, false );
    Canvas.context.lineTo( centreX, centreY );
    Canvas.context.fill();
  },
  
  paintPie : function( screenX, screenY, active, pieValue, pieVisited ) {
    var centre = xLabs.scr2doc( screenX, screenY );
    Paint.paintPiePixels( centre.x, centre.y, active, pieValue, pieVisited );
  },

  paintPiePixels : function( centreX, centreY, active, pieValue, pieVisited ) {

    var pieRadiusPixels     = screen.height * Pies.SLICE_OUTER_RADIUS_FRAC_OF_HEIGHT;
    var pieCentreSizePixels = screen.height * Pies.SLICE_INNER_RADIUS_FRAC_OF_HEIGHT;
    var radiansPerSlice = (Pies.SLICE_RADIANS_END - Pies.SLICE_RADIANS_START) / Pies.SLICES;

    if( active ) {
      Paint.paintPieImage( centreX, centreY, pieRadiusPixels * 2 * 0.9 );
    }

    // Draw pies
    // allow all slices to be "eaten", but only check the important ones
    for( var i = 0; i < Pies.SLICES; ++i ) {
      var th0 = (i  ) * radiansPerSlice + Pies.SLICE_RADIANS_START;// +radiansGap;
      var th1 = (i+1) * radiansPerSlice + Pies.SLICE_RADIANS_START;// -radiansGap;        

      if( active ) {
        var value = Pies.getSliceValue( i );
        if( value == Pies.SLICE_VALUE_VISITED ) { // visited
          Canvas.context.fillStyle = Paint.BACKGROUND_STYLE;//"rgba(0, 150, 0, 0.5)";
          Paint.fillPie( centreX, centreY, pieRadiusPixels, th0, th1 );
        }
        else if( value == Pies.SLICE_VALUE_ERROR ) { // visited
          Canvas.context.fillStyle = "rgba(255, 0, 0, 0.6)"; // "click me"
//          Canvas.context.fillStyle = "rgba(255, 100, 100, 1.0)"; // "click me"
          Paint.fillPie( centreX, centreY, pieRadiusPixels, th0, th1 );
        }
        else {
          // let user see donut
//          Canvas.context.fillStyle = "rgba(255, 153, 0, 0.8)";
        }

      }
      else { // pie not active
        if( Mouse.bMouseDown == false ) {        
//          Canvas.context.fillStyle = "rgba(128, 128, 128, 0.5)";
          Canvas.context.fillStyle = Paint.BACKGROUND_STYLE;//"rgba(0, 150, 0, 0.5)";
          Paint.fillPie( centreX, centreY, pieRadiusPixels, th0, th1 );
        }
      }
        
    }

    // mask out the [non]slices that are not wanted
    Canvas.context.fillStyle = Paint.BACKGROUND_STYLE;
    var tha = 0 * radiansPerSlice + Pies.SLICE_RADIANS_START;
    var thb = Pies.SLICES * radiansPerSlice + Pies.SLICE_RADIANS_START;
    Paint.fillPie( centreX, centreY, pieRadiusPixels, thb, tha );

    // Draw lines between pies
    if( active ) {
      for( var i = 0; i < Pies.SLICES +1; ++i ) {

        if( ( !active ) && ( Mouse.bMouseDown ) ) {
          continue; // dont draw pie at all
        }

        Canvas.context.strokeStyle = "rgba(100, 100, 100, 0.8)";
        Canvas.context.lineWidth = 1;

        var th0 = i * radiansPerSlice + Pies.SLICE_RADIANS_START;
        
        Canvas.context.beginPath();
        Canvas.context.moveTo( centreX, centreY );
        Canvas.context.lineTo( centreX + pieRadiusPixels * Math.cos( th0 ),
                               centreY + pieRadiusPixels * Math.sin( th0 )  );
        Canvas.context.stroke();
      }
    }

    // Draw inner circle
    if( active ) {
      if( pieValue == Pies.PIE_VALUE_DEFAULT ) {
//        Canvas.context.fillStyle = "rgba(255, 180, 0, 1.0)"; // "click me"
//        Canvas.context.fillStyle = "rgba(255, 180, 0, 0.6)"; // "click me"
      }
      else if( pieValue == Pies.PIE_VALUE_MOUSEOVER ) {
//        Canvas.context.fillStyle = "rgba(0, 180, 0, 1.0)"; // "click me"
        Canvas.context.fillStyle = "rgba(155, 255, 155, 0.7)"; // "click me"
        Util.fillCircle( centreX, centreY, pieCentreSizePixels );
      }
      else if( pieValue == Pies.PIE_VALUE_MOUSEDOWN ) {
        if( Pies.isPieComplete() ) {
          Canvas.context.fillStyle = "rgba(0, 200, 0, 1.0)"; // "click me"
          Util.fillCircle( centreX, centreY, pieCentreSizePixels );

          var fontSize = 32;
          var text = "OK";
          Canvas.context.font=fontSize+"px Arial";
          var metrics = Canvas.context.measureText( text );
          var xText = centreX - (metrics.width * 0.5);
          var yText = centreY + (fontSize * 0.25);
          Canvas.context.fillStyle = "rgba(200, 200, 200, 1 )";
          Canvas.context.fillText( text, xText+2, yText+2 );
          Canvas.context.fillStyle = "rgba(0, 100, 0, 1 )";
          Canvas.context.fillText( text, xText, yText );
        }
        else {
          Canvas.context.fillStyle = "rgba(255, 0, 0, 0.6)"; // "click me"
          Util.fillCircle( centreX, centreY, pieCentreSizePixels );
        }
      }
    }
    else { // not the active pie
      if( Mouse.bMouseDown == false ) {        
        Canvas.context.fillStyle = "rgba(128, 128, 128, 0.6)";
        Util.fillCircle( centreX, centreY, pieCentreSizePixels );
      }
    }
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Head tracking
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  paintHead : function() {

    if( Pies.pie >= Pies.nbrPies ) {
      return;
    }

    if( Pies.getPieValue( Pies.pie ) != Pies.PIE_VALUE_MOUSEDOWN ) {
      return;
    }

    var px = Pies.pies[ Pies.pie * Pies.PIE_VALUES + 0 ];
    var py = Pies.pies[ Pies.pie * Pies.PIE_VALUES + 1 ];

    var dx = - (Head.xHead - Head.xHeadOrigin) * screen.height * Paint.HEAD_TRACK_X_SCALE_FRAC_OF_HEIGHT;
    var dy = + (Head.yHead - Head.yHeadOrigin) * screen.height * Paint.HEAD_TRACK_Y_SCALE_FRAC_OF_HEIGHT;

    // update truth coordinates
    var tx = px + dx;
    var ty = py + dy;
    //xLabs.setTruthScreen( tx, ty );
    xLabs.updateCalibrationTruth( tx, ty );
    //console.log( "truth x,y="+tx+","+ty );

    // computed dims
    var radiansPerSlice = (Pies.SLICE_RADIANS_END - Pies.SLICE_RADIANS_START) / Pies.SLICES;
    // var centreX = ( w * px ) +x0; // NOTE: Deliberately scaling everything by screen HEIGHT
    // var centreY = ( h * py ) +y0;
    var centreX = xLabs.scr2docX( px );
    var centreY = xLabs.scr2docY( py );

    var pieRadiusPixels     = screen.height * Pies.SLICE_OUTER_RADIUS_FRAC_OF_HEIGHT;
    var pieCentreSizePixels = screen.height * Pies.SLICE_INNER_RADIUS_FRAC_OF_HEIGHT;

    // update pies
    var visitedSliceValue = Pies.SLICE_VALUE_VISITED;

    if( Errors.hasErrorExcludingPose() ) {
      visitedSliceValue = Pies.SLICE_VALUE_ERROR;
    }

    var dthThreshold = Math.abs( radiansPerSlice * 0.5 );
    for( var i = 0; i < Pies.SLICES; ++i ) {

        // check distance bounds
        var d = Math.sqrt( dx*dx + dy*dy );
        if( ( d < pieCentreSizePixels ) || ( d > pieRadiusPixels ) ) {
          continue;
        }

        // check angle bounds
        var th = Math.atan2( dy, dx );
        var th0 = (i  ) * radiansPerSlice + Pies.SLICE_RADIANS_START;
        var th1 = (i+1) * radiansPerSlice + Pies.SLICE_RADIANS_START; 
        var thMid = (th0+th1) * 0.5;
        var dth = Math.abs( th - thMid ); // distance from slice midpoint angle

        // wrap to bounded range        
        while( dth > 2*Math.PI ) {
          dth -=  2 * Math.PI;
        } 
        if( dth > Math.PI ) {
          dth = 2 * Math.PI - dth;
        }
        if( dth > dthThreshold ) {
          continue; // inside slice?
        }

        var oldSliceValue = Pies.getSliceValue( i );
        if( oldSliceValue != Pies.SLICE_VALUE_VISITED ) {
          Pies.setSliceValue( i, visitedSliceValue ); // only allow to go from bad to good, not good to bad
        }
    } // foreach( slice )

    // Draw face pose
    if( Pies.pie >= Pies.nbrPies ) {
      return;
    }

    if( Mouse.bMouseDown == false ) {
      return;
    }

    var x = centreX + dx;
    var y = centreY + dy;
    var xMin = centreX - pieRadiusPixels; 
    var xMax = centreX + pieRadiusPixels; 
    var yMin = centreY - pieRadiusPixels; 
    var yMax = centreY + pieRadiusPixels; 
    x = Math.max( xMin, Math.min( xMax, x ) ) ;
    y = Math.max( yMin, Math.min( yMax, y ) ) ;

    Paint.paintHeadMark( x, y ) ;
  },

  paintHeadMark : function( x, y ) {
    Canvas.context.fillStyle = "rgba(  0,  0,  0, 1)";
    Util.fillCircle( x, y, Paint.HEAD_TRACK_FILL_SIZE );
    Canvas.context.strokeStyle = "rgba(  0,  0,  0, 1)";
    Util.drawCircle( x, y, Paint.HEAD_TRACK_STROKE_SIZE );

    if( Errors.hasBadTrack() ) {
      Canvas.context.fillStyle = "rgba(255, 0, 0, 1)";
      Util.fillCircle( x, y, Paint.HEAD_TRACK_STROKE_SIZE * 0.5 );
    }
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Pose
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  paintPose : function() {  
    var positionScale = 100.0; // scale only for viewing, meaningless
    var boxSize = 0.15;
    var highlightSize = 0.05;

    // paint head pose crosshairs
    var w = screen.width ;// screen.width;
    var h = screen.height;//screen.height;

    Canvas.context.beginPath();

    var bx1 = w * boxSize;
    var bx2 = w - bx1;
    var by1 = h * boxSize;
    var by2 = h - by1;

    var cx = w * 0.5;
    var cy = h * 0.45;//0.5;
    var hx = cx - ( Head.xHead * positionScale );
    var hy = cy + ( Head.yHead * positionScale );

    // paint the centering marks -the reference lines
    Canvas.context.beginPath();
    Canvas.context.lineWidth = 1;
    Canvas.context.strokeStyle = "rgba(200, 200, 200, 0.6 )";

    // vertical bars
    Canvas.context.moveTo( cx, 0 );
    Canvas.context.lineTo( cx, by1 );
    Canvas.context.moveTo( cx, by2 );
    Canvas.context.lineTo( cx, h );

    // horz bars
    Canvas.context.moveTo( 0, cy );
    Canvas.context.lineTo( bx1, cy );
    Canvas.context.moveTo( bx2, cy );
    Canvas.context.lineTo( w, cy );
    Canvas.context.stroke();

    // 3 states:
    // 1. don't care: 1 px thin line, grey.
    // 2. care, but bad
    // 3. care, and good
    var lineWidthX = 1;
    var lineWidthY = 1;
    var strokeStyleX = "rgba(200, 200, 200, 1.0 )";
    var strokeStyleY = "rgba(200, 200, 200, 1.0 )";
    var fillStyleX = null;
    var fillStyleY = null;

    if( Paint.poseCheckX ) {
      lineWidthX = 5;
      if( Errors.hasBadPoseX() ) {
        fillStyleX = "rgba(255, 180, 0, 0.1)"; // bad
        strokeStyleX = "rgba(255, 180, 100, 0.6 )";
      }
      else {
        fillStyleX = "rgba(100, 250, 100, 0.1 )";
        strokeStyleX = "rgba(100, 200, 100, 0.6 )";
      }
    }
    if( Paint.poseCheckY ) {
      lineWidthY = 5;
      if( Errors.hasBadPoseY() ) {
        fillStyleY = "rgba(255, 180, 0, 0.1)"; // bad
        strokeStyleY = "rgba(255, 180, 100, 0.6 )";
      }
      else {
        fillStyleY = "rgba(100, 250, 100, 0.1 )";
        strokeStyleY = "rgba(100, 200, 100, 0.6 )";
      }
    }

    // now do the actual head position
    // paint highlights for some lines
    var highW = h * highlightSize * 0.5;

    if( fillStyleX != null ) {
      Canvas.context.fillStyle = fillStyleX;
      Canvas.context.fillRect( hx-highW, 0, highW+highW, h );
    }
    if( fillStyleY != null ) {
      Canvas.context.fillStyle = fillStyleY;
      Canvas.context.fillRect( 0, hy-highW, w, highW+highW );
    }

    // paint lines indicating head position in image
    Canvas.context.lineWidth = lineWidthX;
    Canvas.context.strokeStyle = strokeStyleX;
    Canvas.context.beginPath();
    Canvas.context.moveTo( hx, 0 );
    Canvas.context.lineTo( hx, h );
    Canvas.context.stroke();

    Canvas.context.lineWidth = lineWidthY;
    Canvas.context.strokeStyle = strokeStyleY;
    Canvas.context.beginPath();
    Canvas.context.moveTo( 0, hy );
    Canvas.context.lineTo( w, hy );
    Canvas.context.stroke();
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Text
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  paintHelp : function() {
    // 0   Press and HOLD left mouse button on the active circle.
    // 1   Rotate your head to drag the red dot over each pie slice.
    // 2   Let go of the mouse button when the circle turns green.
    // 3.  Key 'ESC' to end calibration. 'D' to delete calibration data.
    // NB: 'T' and 'C' are hidden key commands.
    var textStyle = "rgba(150, 150, 150, 0.7 )";
    var fontSize = 16;
    var xScreenFrac = 0.1;
    var yScreenFrac = 0.6;

    var text1 = "Press and HOLD left mouse button on the active circle.";
    var text2 = "Rotate your head to drag the red dot over each pie slice.";
    var text3 = "Let go of the mouse button when the circle turns green.";
    var text4 = "Key 'ESC' to end calibration. 'D' to delete calibration data.";
    Paint.paintTextFixed( text1, textStyle, fontSize, xScreenFrac, yScreenFrac, 0 );
    Paint.paintTextFixed( text2, textStyle, fontSize, xScreenFrac, yScreenFrac, 1 );
    Paint.paintTextFixed( text3, textStyle, fontSize, xScreenFrac, yScreenFrac, 2 );
    Paint.paintTextFixed( text4, textStyle, fontSize, xScreenFrac, yScreenFrac, 3 );
  },

  paintInfo : function( infoMessage ) {
    Paint.paintTextCentre( infoMessage, null, null, "rgba(100, 100, 100, 1 )", 32, 0.5 );
  },

  paintError : function( errorMessage ) {
    Paint.paintTextCentre( errorMessage, null, "rgba(200, 0, 0, 1.0 )", "rgba(255, 255, 255, 1 )", 32, 0.5 );
  },

  paintPriority : function( priorityMessage ) {
    Paint.paintTextCentre( priorityMessage, null, "rgba(0, 0, 0, 0.6 )", "rgba(200, 200, 200, 1 )", 40, 0.25 );
  },

  paintWarning : function( warningMessage ) {
    Paint.paintTextCentre( warningMessage, null, null, "rgba(200, 200, 200, 1 )", 40, 0.25 );
  },

  paintTextCentre : function( text, backgroundStyle, barStyle, textStyle, fontSize, yScreenFrac ) {

    // http://www.html5canvastutorials.com/tutorials/html5-canvas-text-metrics/
    // Note: Since the height of the text in pixels is equal to the font size in pts when the font is defined with the font property of the canvas context, the metrics object returned from measureText() does not provide a height metric.
    if( backgroundStyle != null ) {
      Canvas.context.fillStyle = backgroundStyle;//"rgba(0, 0, 0, 0.7)";
      Canvas.context.fillRect( 0, 0, screen.width, screen.height );
    }

    var hBar = fontSize * 2.0;
    //var yBar = (screen.height*yScreenFrac)-(hBar*0.5)-( .documentOffsetY + window.screenY ); // doc offset makes it centered on the SCREEN rather than the client area.
    var yBar = ( screen.height * yScreenFrac ) - ( hBar * 0.5 );
    yBar = xLabs.scr2docY( yBar ); // doc offset makes it centered on the SCREEN rather than the client area.

    if( barStyle != null ) {
      Canvas.context.fillStyle = barStyle; //"rgba(200, 20, 0, 0.7 )";
      Canvas.context.fillRect( 0, yBar, screen.width, hBar );
    }

    Canvas.context.fillStyle = textStyle; //"rgba(255, 255, 255, 1 )";
    Canvas.context.font=fontSize + "px Arial";

    var metrics = Canvas.context.measureText( text );
    //var xText = (screen.width * 0.5) - (metrics.width * 0.5)-( .documentOffsetX + window.screenX );
    var xText = (screen.width * 0.5) - (metrics.width * 0.5);
    xText = xLabs.scr2docX( xText );
    var yText = yBar + (hBar*0.5) + (fontSize * 0.5);

    Canvas.context.fillText( text, xText, yText );
  },

  paintTextFixed : function( text, textStyle, fontSize, xScreenFrac, yScreenFrac, rowOffset ) {

    // http://www.html5canvastutorials.com/tutorials/html5-canvas-text-metrics/
    // Note: Since the height of the text in pixels is equal to the font size in pts when the font is defined with the font property of the canvas context, the metrics object returned from measureText() does not provide a height metric.
    var xText = (screen.width  * xScreenFrac);
    var yText = (screen.height * yScreenFrac);

    // offset yText by the rows:
    yText = yText + ( rowOffset * fontSize );
    Canvas.context.fillStyle = textStyle; //"rgba(255, 255, 255, 1 )";
    Canvas.context.font=fontSize + "px Arial";
    Canvas.context.fillText( text, xText, yText );
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Buttons
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  buttonPaint : function( buttonText, buttonStyle, buttonTextStyle, fontSize ) {
    // paint the button:
    Canvas.context.lineWidth = 1;
    Paint.buttonPainted = true;
    var rect = Paint.buttonGetRectDefault();

    if( buttonStyle != null ) {
      Canvas.context.fillStyle = buttonStyle; //"rgba(200, 20, 0, 0.7 )";
      Canvas.context.fillRect( rect.x, rect.y, rect.w, rect.h );
    }

    Canvas.context.fillStyle = buttonTextStyle;
    Canvas.context.font=fontSize + "px Arial";

    var buttonMetrics = Canvas.context.measureText( buttonText );
    var xText = rect.x + (rect.w * 0.5) - (buttonMetrics.width * 0.5); // centre aligned within rect
    var yText = rect.y + (rect.h * 0.5) + (fontSize * 0.25);


    Canvas.context.fillText( buttonText, xText, yText );
    Canvas.context.strokeStyle = "rgba( 127,127,127,0.5 );";
    Canvas.context.strokeRect( rect.x, rect.y, rect.w, rect.h );
  },

  paintMessageButton : function( barText, buttonText, isInfo ) {
    var fontSize = 32;
    //var barStyle = buttonText !== null || isInfo ? "rgba(0,0,0,0)" : "rgba( 200, 0, 0, 1.0 )" ;
    var  barStyle = null;//"rgba(0,0,0,0)"; // transparent
    var textStyle = "rgba( 100, 100, 100, 1.0 )" // dark grey
    if( isInfo ) {
      barStyle = "rgba(200,0,0,1.0)"; // transparent
      textStyle = "rgba( 255, 255, 255, 1.0 )" // dark grey
    }

    if( barText != null ) {
      Paint.paintTextCentre( barText, Paint.BACKGROUND_STYLE, barStyle, textStyle, fontSize, 0.5 );
    }

    if( buttonText == null ) {
      return;
    }

    var buttonStyle = "rgba(255, 255, 255, 1 )";
    var buttonTextStyle = "rgba(0, 114, 188, 1 )";
    if( Paint.buttonMouseOver() ) {
      buttonStyle = "rgba(220, 220, 220, 1 )";
    }  
    Paint.buttonPaint( buttonText, buttonStyle, buttonTextStyle, fontSize+6 );
  },

  buttonGetRectDefault : function() {
    var x = Paint.BUTTON_X;
    var y = Paint.BUTTON_Y;
    var w = Paint.BUTTON_W;
    var h = Paint.BUTTON_H;
    return Paint.buttonGetRect( x, y, w, h );
  },
  buttonGetRect : function( x, y, w, h ) {
    var xButton = screen.width  * x - ( screen.height * w * 0.5 );
    var yButton = screen.height * y - ( screen.height * h * 0.5 )
    var wButton = screen.height * w; // NB Deliberately height
    var hButton = screen.height * h;

    xButton = xLabs.scr2docX( xButton );//xButton -( .documentOffsetX + window.screenX );
    yButton = xLabs.scr2docY( yButton );//yButton -( .documentOffsetY + window.screenY ); // this is correct formula for when window is not maximized

    var buttonRect = { x: xButton, y: yButton, w: wButton, h: hButton };
    //console.log( JSON.stringify( buttonRect ) );
    return buttonRect;
  },
  
  buttonMouseOver : function() {
    if( Paint.buttonEnabled == false ) {
      return false;
    }
    var rect = Paint.buttonGetRectDefault();

    var xMouse = xLabs.scr2docX( Mouse.xMouseScreen );
    var yMouse = xLabs.scr2docY( Mouse.yMouseScreen );
    //var xMouse = .mouseMovedScreenX - .documentOffsetX - window.screenX;
    //var yMouse = .mouseMovedScreenY - .documentOffsetY - window.screenY;
    var mouseOver = Util.rectangleInside( xMouse, yMouse, rect.x, rect.y, rect.w, rect.h );
    return mouseOver;
  },

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // General - per mode/step: Pull all this together
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  paint : function() {

    // paint based on the step:
    Paint.buttonPainted = false;
    //var calibrationStep = Paint.getCalibrationStep();
    // console.log( "calib paint, mode="+calibrationMode+" step="+calibrationStep );
    var state = Donut.state.getState();

    if( state == Donut.STATE_ERROR ) {
      Canvas.context.fillStyle = Paint.BACKGROUND_STYLE;
      Canvas.context.fillRect( 0, 0, screen.width, screen.height );
      if( Errors.hasErrorExcludingPose() ) {
        Paint.paintError( Errors.errorMessage );     
      }
      else {
        Paint.paintInfo( "Fixed! Thankyou :)" );     
      }
    }
    else if( state == Donut.STATE_NONE ) {
      // nothing      
    }
    else if( state == Donut.STATE_COMFORT ) {
      Paint.paintStepComfort();
    }
    else if( state == Donut.STATE_POSE ) {
      Paint.paintStepPose();
    }
    else if( state == Donut.STATE_INFO ) {
      Paint.paintStepPiesM();
    }
    else if( state == Donut.STATE_PIES ) {
      Paint.paintStepPies();
    }
    else if( state == Donut.STATE_DONE ) {
      Paint.paintStepFadeM();
    }
    else if( state == Donut.STATE_FADE ) {
      Paint.paintStepFade();
    }

    if( Paint.buttonPainted == true ) {  
      Paint.buttonEnabled = true;
    }
    else {
      Paint.buttonEnabled = false;
    }
  },

  paintStepComfort : function() {
    // Messages
    //if( Errors.errorMessage.length > 0 ) {
    if( Errors.hasErrorExcludingPose() ) {
      Paint.paintMessageButton( Errors.errorMessage, null, true );
    }
    else {
      Paint.paintMessageButton( "Adjust seat and computer - make yourself comfortable.", "Next", false );
    }
  },        
  paintStepPose : function() {

    if( Errors.hasErrorExcludingPose() ) {
      Paint.paintMessageButton( Errors.errorMessage, null, true );
      return;
    }

    // Pose crosshairs
    Canvas.context.fillStyle = Paint.BACKGROUND_STYLE;
    Canvas.context.fillRect( 0, 0, screen.width, screen.height );

    var xHead = parseFloat( xLabs.getConfig( "state.head.x" ) );
    var yHead = parseFloat( xLabs.getConfig( "state.head.y" ) );

    var timeout = Donut.timer.hasElapsed();//Paint.getTransitionTime();
    if( timeout < 1.0 ) {
      Paint.paintMessageButton( "Get yourself in the centre of the camera view.", null, false );
    }
    else if( Errors.hasBadPoseX() ) {
      //if( .state.kvHeadX < 0.0 ) {    
      if( xHead < 0.0 ) {    
        Paint.paintMessageButton( "Please move a little to the left.", null, false );
      }
      else {
        Paint.paintMessageButton( "Can you move to the right a bit?", null, false );
      }
    }
    else if( Errors.hasBadPoseY() ) {
      if( yHead < 0.0 ) {    
        Paint.paintMessageButton( "Aim the camera up a bit higher.", null, false );
      }
      else {
        Paint.paintMessageButton( "Point the camera down towards the desk a little.", null, false );
      }
    }
    else {
      Paint.paintMessageButton( "That's great, thanks.", "Next", false );
    }

    Paint.paintPose();
  },        
  paintStepPiesM : function() {
    var w = screen.width ;// screen.width;
    var h = screen.height;//screen.height;
    //var x0 = -( .documentOffsetX + window.screenX );
    //var y0 = -( .documentOffsetY + window.screenY ); // this is correct formula for when window is not maximized
    var x0 = xLabs.scr2docX( 0 );
    var y0 = xLabs.scr2docY( 0 );

    // computed dims
    var radiansPerSlice = (Pies.SLICE_RADIANS_END - Pies.SLICE_RADIANS_START) / Pies.SLICES;
    var centreX = ( w * 0.5 ) +x0; // NOTE: Deliberately scaling everything by screen HEIGHT
    var centreY = ( h * 0.25 ) +y0;

    var pieSizePixels = screen.height * Pies.SLICE_OUTER_RADIUS_FRAC_OF_HEIGHT;
    var centreXa = centreX - pieSizePixels * 1.0;
    var centreXb = centreX + pieSizePixels * 1.0;

    Paint.paintMessageButton( "Eat donuts, by looking at them while PRESSING mouse button & rotating your head.", "I'm ready", false );
//    Paint.paintPieImage( centreXa, centreY, pieSizePixels );
    Paint.paintRotateImage( centreXb, centreY, pieSizePixels );
    Paint.paintPiePixels( centreXa, centreY, true, Paint.PIE_VALUE_MOUSEDOWN, 0 );

    var point = Paint.getRotatePoint();
    Paint.setRotateVisit();
    Paint.paintHeadMark( centreXa+point.x, centreY+point.y );
  },        
  paintStepPies : function() {
    // background
    Canvas.context.fillStyle = Paint.BACKGROUND_STYLE;
    Canvas.context.fillRect( 0, 0, screen.width, screen.height );

    // Calib marks
    //Paint.headTrackUpdate();
    Paint.paintPies();
    Paint.paintHead();

    if( Mouse.bMouseDown == false ) {
      // Messages
      //if( Errors.hasErrorExcludingPose() ) {//Errors.errorMessage.lengt != null ) {
      if( Errors.hasErrorExcludingPose() ) {//Errors.errorMessage.lengt != null ) {
        Paint.paintMessageButton( Errors.errorMessage, null, true );
      }

      // Pose crosshairs
      Paint.paintPose();
    }
  },        
  paintStepFadeM : function() {
    Paint.paintMessageButton( "Calibration ready!", "Continue", false );
  },        
  paintStepFade : function() {
    var timeout = Donut.timer.elapsedFrac();//Paint.getTransitionTime();
    var alpha = 1.0 - timeout;
    // console.log( "face alpha = "+alpha );
    Canvas.context.clearRect( 0, 0, screen.width, screen.height );
    Canvas.context.fillStyle = "rgba( 50, 50, 50, "+alpha+")";
    Canvas.context.fillRect( 0, 0, screen.width, screen.height );
  }

};



