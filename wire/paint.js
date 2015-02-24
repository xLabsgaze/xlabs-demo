
///////////////////////////////////////////////////////////////////////////////////////////////////
// Error and warning detection with debouncing and easy handling of multiple error conditions.
///////////////////////////////////////////////////////////////////////////////////////////////////
var Paint = {

  styleStart : "rgba( 200, 200, 200, 1.0 )",
  styleStartMouse : "rgba( 200, 250, 200, 1.0 )",
  styleAnchor : "rgba( 200, 200, 200, 1.0 )",
  styleAnchorLine : "rgba( 200, 200, 200, 0.5 )",
  styleAvatar : "rgba( 200, 200, 255, 0.5 )",
  styleAvatarError : "rgba( 255, 0, 0, 1.0 )",
  styleWindowMask : "rgba( 250, 250, 250, 1.0 )",
  styleText : "rgba( 100, 100, 100, 1.0 )",

  styleBackground : "rgba( 255, 255, 255, 1.0 )",
  styleHazard : "rgba( 250,   0,   0, 0.7 )",
  styleAvatar : "rgba(   0,   0, 255, 0.5 )",
  styleHazardLine : "rgba( 250, 200, 200, 1.0 )",
  styleText : "rgba( 50, 50, 50, 1.0 )",
  styleTextFaint : "rgba( 0, 0, 0, 1.0 )",
  fontSizeMedium : 32,
  fontSizeSmall : 24,

  positionScale : 100.0,
  boxSize : 0.15,
  highlightSize : 0.05,

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Paint Methods
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  paintBackground : function() {
    Canvas.context.fillStyle = Paint.styleBackground;
    Canvas.context.fillRect( 0, 0, Canvas.element.width, Canvas.element.height );
  },

  paintError : function() {
    Paint.paintBackground();

    // Debug:
    //Canvas.context.fillStyle = "rgba( 255, 0, 0, 1.0 )";
    //Canvas.context.fillRect( 0, 0, 200,200 );

    // TODO: have an optional "show warnings" version .

    // error or warning messages.
    var w = Canvas.element.width ;// screen.width;
    var h = Canvas.element.height;//screen.height;

    Canvas.context.beginPath();

    var cx = w * 0.5;
    var cy = h * 0.3;

    var text = null;

    if( Errors.hasErrorExcludingPose() ) {
      text = "Error: " + Errors.errorMessage;
    }
/*    if( Errors.errorMessage.length > 0 ) {
      text = "Error: " + Errors.errorMessage;
    }
    else if( Errors.warningMessage.length > 0 ) {
      text = "Warning: " + Errors.warningMessage;
    }*/
    else {
      text = "Checking environment...";//"Everything is perfect.";
    }

    if( text != null ) {
      Paint.fillTextCentred( text, Paint.styleText, Paint.fontSizeMedium, cx, cy );
    }
  },

  fillTextCentred : function( text, style, fontSize, x, y ) {
    Canvas.context.fillStyle = style;
    Canvas.context.font=fontSize + "px Arial";

    var metrics = Canvas.context.measureText( text );
    var xText = x - (metrics.width * 0.5);
    var yText = y + (fontSize * 0.5);

    Canvas.context.fillText( text, xText, yText );
  },

  paintLegend : function() {
    var lineHeight = Paint.fontSizeSmall * 2.0;
    var radius = Path.getTargetSize();
    var x1 = Canvas.element.width * 0.75;
    var x2 = x1 - 100;

    var y1 = Canvas.element.height * 0.25;
    var y2 = y1 + lineHeight;
    var y3 = y2 + lineHeight;

    Canvas.context.fillStyle = Paint.styleHazard;
    Util.fillCircle( x2, y2, radius );

    Canvas.context.fillStyle = Paint.styleAvatar;
    Util.fillCircle( x2, y3, radius );

    Paint.fillTextCentred( "Instructions",      Paint.styleText, Paint.fontSizeSmall, x1, y1 );
    Paint.fillTextCentred( "Avoid these", Paint.styleText, Paint.fontSizeSmall, x1, y2 );
    Paint.fillTextCentred( "This is you", Paint.styleText, Paint.fontSizeSmall, x1, y3 );
  },

  paintPose : function() {
    Paint.paintBackground();

    //var positionScale = 100.0; // this scale only for viewing, meaningless
    //var boxSize = 0.15;
    //var highlightSize = 0.05;

    // paint head pose crosshairs
    var w = Canvas.element.width ;// screen.width;
    var h = Canvas.element.height;//screen.height;

    Canvas.context.beginPath();

    var bx1 = w * Paint.boxSize;
    var bx2 = w - bx1;
    var by1 = h * Paint.boxSize;
    var by2 = h - by1;

    var stateHeadX = parseFloat( xLabs.getConfig( "state.head.x" ) );
    var stateHeadY = parseFloat( xLabs.getConfig( "state.head.y" ) );

    var cx = w * 0.5;
    var cy = h * 0.5;
    var hx = cx - ( stateHeadX * Paint.positionScale );
    var hy = cy + ( stateHeadY * Paint.positionScale );

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

    var qx = w * 0.25;
    var qy = h * 0.25;
    Paint.fillTextCentred( "Adjust camera position", Paint.styleText, Paint.fontSizeMedium, qx, qy );

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

    if( true ) {//this.poseCheckX ) {
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
    if( true ) {//this.poseCheckY ) {
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
    var highW = h * Paint.highlightSize * 0.5;

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

  paintInfo : function() {
    Paint.paintBackground();
    Paint.paintLegend();
  },

  paintGame : function() {
    Paint.paintBackground();
    Path.paint();
    Path.hazardPaint();

    var cStart = Path.getCoordinateStart();
    var cEnd   = Path.getCoordinateEnd();
    var cNow   = Path.getCoordinate();

    var xStart = xLabs.scr2docX( Path.path2docX( cStart.x ) ); // TODO make fn
    var yStart = xLabs.scr2docY( Path.path2docY( cStart.y ) );

    var xEnd = xLabs.scr2docX( Path.path2docX( cEnd.x ) );
    var yEnd = xLabs.scr2docY( Path.path2docY( cEnd.y ) );

    var xNow = xLabs.scr2docX( Path.path2docX( cNow.x ) );
    var yNow = xLabs.scr2docY( Path.path2docY( cNow.y ) );

    var cHead = Head.get();
    var dx = cHead.x;
    var dy = cHead.y;

    // a line linking the two points
    Canvas.context.beginPath(); 
    Canvas.context.lineWidth = "1";
    Canvas.context.strokeStyle = Paint.styleAnchorLine;
    Canvas.context.moveTo( xNow, yNow );
    Canvas.context.lineTo( xNow+dx, yNow+dy );
    Canvas.context.stroke(); // Draw it

    Canvas.context.fillStyle = Paint.styleStart;

    var radius = Path.getTargetSize();
    var radiusWindow = Path.getWindowSize();

    Util.fillCircle( xEnd, yEnd, radius );

    var mouseX = xLabs.scr2docX( Mouse.xMouseScreen );
    var mouseY = xLabs.scr2docY( Mouse.yMouseScreen );
    var mouseStartDistance = Util.distance( mouseX, mouseY, xStart, yStart );
    if( mouseStartDistance < ( radius * 2.0 ) ) {
      Canvas.context.fillStyle = Paint.styleStartMouse;
    }

    Util.fillCircle( xStart, yStart, radius * 2.0 );

    var radiusAnchor = Math.round( radius * 0.3 );
    Canvas.context.fillStyle = Paint.styleAnchor;
    Util.fillCircle( xNow, yNow, radiusAnchor );

    Canvas.context.fillStyle = Paint.styleAvatar;
    Util.fillCircle( xNow+dx, yNow+dy, radius );

    if( Errors.hasErrorExcludingPose() ) {
      Canvas.context.strokeStyle = Paint.styleAvatarError;
      Canvas.context.lineWidth = "1";
      Util.drawCircle( xNow+dx, yNow+dy, radius +2 );
    }

    // TODO 3 and you're out.    

    var wx1 = Math.max( 0, xNow -radiusWindow );
    var wx2 = Math.min( Canvas.element.width, xNow +radiusWindow );
    var ww2 = Canvas.element.width-wx2;
    var wy1 = 0;
    var wy2 = Math.min( Canvas.element.height, yNow +radiusWindow );
    var wh1 = Math.max( 0, yNow -radiusWindow );
    var wh2 = Canvas.element.height - wy2;
    Canvas.context.fillStyle = Paint.styleWindowMask
    Canvas.context.fillRect(   0, 0, wx1, Canvas.element.height ); // left
    Canvas.context.fillRect( wx2, 0, ww2, Canvas.element.height ); // right
    Canvas.context.fillRect( wx1, wy1, wx2-wx1, wh1 ); // top
    Canvas.context.fillRect( wx1, wy2, wx2-wx1, wh2 ); // bottom

    if( Path.timePaused == 1 ) {
      var rArrow = 50;
      var xArrow1 = xStart - rArrow;
      var xArrow2 = xStart;
      var xArrow3 = xStart + rArrow;
      var yArrow1 = yStart + Paint.fontSizeMedium * 1.0;
      var yArrow2 = yStart + Paint.fontSizeMedium * 2.0;
      // paint the "click to start" message
      Canvas.context.beginPath();
      Canvas.context.fillStyle = Paint.styleText;
      Canvas.context.moveTo( xArrow1, yArrow2 );
      Canvas.context.lineTo( xArrow2, yArrow1 );
      Canvas.context.lineTo( xArrow3, yArrow2 );
      Canvas.context.lineTo( xArrow1, yArrow2 );
      Canvas.context.fill();
      Canvas.context.closePath();

      Paint.fillTextCentred( "Click to start", Paint.styleText, Paint.fontSizeMedium, xStart, yStart + Paint.fontSizeMedium * 3.0 );
//      this.paintLegend(); // TODO should be a different state, then click "OK"
    }
  }

};



