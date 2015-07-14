///////////////////////////////////////////////////////////////////////////////////////////////////
// Error and warning detection with debouncing and easy handling of multiple error conditions.
///////////////////////////////////////////////////////////////////////////////////////////////////
var Graphics = {

  mouseOverButton : false, 

  debugElement : function( elementId, showError ) {
//    var borderOk = "border:none;"
    var valueOk = "#dfdfdf";
    var valueNg = "#ff0000";

    var value = valueOk;
    if( showError ) {
      value = valueNg;
    }

    //var cssv = { "color": value };
    //$( "#"+elementId ).css( cssv );
    document.getElementById( elementId ).style.color = value;
  },

  hideDebug : function() {
  },
  showDebug : function() {
    var hasError = false;

    var faceMissingError = Errors.hasNoFace();

    var face = xLabs.getConfig( "validation.facePosition" );
    var parts = face.split( "," );

    var fx = parseFloat( parts[ 0 ] );
    var fy = parseFloat( parts[ 1 ] );
    var fw = parseFloat( parts[ 2 ] );
    var fh = parseFloat( parts[ 3 ] );

    var facePaint = true;
    if( isNaN( fx ) || isNaN( fy ) || isNaN( fw ) || isNaN( fh ) ) {
      facePaint = false;
      faceMissingError = true;
    }

     Graphics.debugElement( "face-missing", faceMissingError );
     hasError = hasError | faceMissingError;

     var facePoseError = Errors.hasBadPose();
     Graphics.debugElement( "face-pose", facePoseError );
     hasError = hasError | facePoseError;

     var faceSmallError = Errors.historySize.hasError();//freq Error( Errors.freq WarningSize.getMean() );
     Graphics.debugElement( "face-small", faceSmallError );
     hasError = hasError | faceSmallError;

     var faceDarkError = Errors.historyDark.hasError();//Errors.freq Error( Errors.freq WarningDark.getMean() );
     Graphics.debugElement( "face-dark", faceDarkError );
     hasError = hasError | faceDarkError;

     var faceSideError = Errors.historyUneven.hasError();//Errors.freq Error( Errors.freq WarningUneven.getMean() );
     Graphics.debugElement( "face-side", faceSideError );
     hasError = hasError | faceSideError;

     var faceBrightError = Errors.historyBright.hasError();//Errors.freq Error( Errors.freq WarningBright.getMean() );
     Graphics.debugElement( "face-bright", faceBrightError );
     hasError = hasError | faceBrightError;

     var faceTrackError = Errors.hasBadTrack();
     Graphics.debugElement( "face-track", faceTrackError );
     hasError = hasError | faceTrackError;

    var x0 = 100;
    var y0 = 100;
    var dilationX = 0.2;
    var dilationY = 0.3;

    // get position and size of the video element to scale graphics
    var videoElement = document.getElementById( "xLabsPreview" );
    var videoRect = videoElement.getBoundingClientRect();

    var iw = xLabs.getConfig( "frame.stream.width" );
    var ih = xLabs.getConfig( "frame.stream.height" );

    if( facePaint ) {

      var frx = fw * 0.5; //videoRect.height/10;
      var fry = fh * 0.5; //videoRect.height/10;
      var fcx = fx + frx;
      var fcy = fy + fry;
 
      var cx = fcx / iw; 
      var cy = fcy / ih;
      frx = frx / iw; 
      fry = fry / ih;
   
      cx = cx * videoRect.width; 
      cy = cy * videoRect.height;
      frx = frx * videoRect.width; 
      fry = fry * videoRect.height;
 
      frx = frx * 1.5;
      fry = fry * 2.0;

      var stroke = "rgba( 0,255,0,0.5 )"
      if( hasError ) {
        stroke = "rgba( 255,0,0,0.5 )";
      }

      // face circle
      var faceCircle = document.getElementById( "regionFace" );//$( "#regionFace" )[0];
      faceCircle.setAttribute( "cx", cx + videoRect.left );
      faceCircle.setAttribute( "cy", cy + videoRect.top );
      faceCircle.setAttribute( "rx", frx );
      faceCircle.setAttribute( "ry", fry );
      faceCircle.setAttribute( "stroke", stroke );
    }

    // pose crosshairs
    var xMin = videoRect.left;
    var xMax = videoRect.left + videoRect.width;
    var yMin = videoRect.top;
    var yMax = videoRect.top + videoRect.height;

    var xt = xMin + videoRect.width  * 0.5;
    var yt = yMin + videoRect.height * 0.38;//0.5;
    
    //var x = parseFloat( xLabs.getConfig( "state.head.x" ) );
    //var y = parseFloat( xLabs.getConfig( "state.head.y" ) );
    var dxy = Errors.getPoseError();
    var xBad = Errors.hasBadPoseX();
    var yBad = Errors.hasBadPoseY();
    
    var scale = 100.0;
    var dxh =  dxy.x * scale;
    var dyh =  dxy.y * scale 
    var xOk = !xBad; 
    var yOk = !yBad;
    var xh = xt +dxh;
    var yh = yt +dyh;
    
    var xtLine = document.getElementById( "xtDebug" );//$( "#xtDebug" )[0];
    var ytLine = document.getElementById( "ytDebug" );//$( "#ytDebug" )[0];
    var xhLine = document.getElementById( "xhDebug" );//$( "#xhDebug" )[0];
    var yhLine = document.getElementById( "yhDebug" );//$( "#yhDebug" )[0];
    var xhLine2 = document.getElementById( "xh2Debug" );//$( "#xh2Debug" )[0];
    var yhLine2 = document.getElementById( "yh2Debug" );//$( "#yh2Debug" )[0];

    xtLine.setAttribute( "x1", xMin );
    xtLine.setAttribute( "x2", xMax );
    xtLine.setAttribute( "y1", yt );
    xtLine.setAttribute( "y2", yt );

    ytLine.setAttribute( "x1", xt );
    ytLine.setAttribute( "x2", xt );
    ytLine.setAttribute( "y1", yMin );
    ytLine.setAttribute( "y2", yMax );

    xhLine.setAttribute( "x1", xMin );
    xhLine.setAttribute( "x2", xMax );
    xhLine.setAttribute( "y1", yh );
    xhLine.setAttribute( "y2", yh );

    yhLine.setAttribute( "x1", xh );
    yhLine.setAttribute( "x2", xh );
    yhLine.setAttribute( "y1", yMin );
    yhLine.setAttribute( "y2", yMax );

    xhLine2.setAttribute( "x1", xMin );
    xhLine2.setAttribute( "x2", xMax );
    xhLine2.setAttribute( "y1", yh );
    xhLine2.setAttribute( "y2", yh );

    yhLine2.setAttribute( "x1", xh );
    yhLine2.setAttribute( "x2", xh );
    yhLine2.setAttribute( "y1", yMin );
    yhLine2.setAttribute( "y2", yMax );

    var xStroke = "#AA0000";
    var yStroke = "#AA0000";
    var xStroke2 = "rgba( 255,0,0,0.2 )";
    var yStroke2 = "rgba( 255,0,0,0.2 )";

    if( xOk ) { yStroke = "#009900"; yStroke2 = "rgba( 0,0,0,0 )"; }
    if( yOk ) { xStroke = "#009900"; xStroke2 = "rgba( 0,0,0,0 )"; }

    xhLine.setAttribute( "stroke", xStroke );
    yhLine.setAttribute( "stroke", yStroke );

    xhLine2.setAttribute( "stroke", xStroke2 );
    yhLine2.setAttribute( "stroke", yStroke2 );

    return hasError;
  },

  hideMessage : function() {
    document.getElementById( "checkMessageButton" ).style.display = "none";
    //$( "#messageButton" ).css( {"display":"none"} );
    //$( "#messageButton #message" ).css( {"display":"none"} );
    //$( "#messageButton #button" ).css( {"display":"none"} );
  },

  showMessage : function( text, buttonText, isError, yPosition ) {

    if( !text ) {
      Graphics.hideMessage();
      return;
    }

    var messageButtonElement = document.getElementById( "checkMessageButton" );
    var messageElement = document.getElementById( "checkMessage" );
    var buttonElement = document.getElementById( "checkButton" );

    if( typeof(yPosition)==='undefined') yPosition = "40%";
    //$( "#messageButton" ).css( {"top": yPosition, "display":"block" } );
    messageButtonElement.style.top = yPosition;
    messageButtonElement.style.display = "block";

    //$( "#message" ).css( {"display":"block"} );
    messageElement.style.display = "block";

    //$( "#message" )[0].innerHTML = text;
    messageElement.innerHTML = text;

    if( buttonText != null ) {
      //$( "#button" ).css( {"display":"block"} );
      buttonElement.style.display = "block";
      //$( "#button" )[0].value = buttonText;
      buttonElement.value = buttonText;
    }
    else {
      //$( "#button" ).css( {"display":"none"} );
      buttonElement.style.display = "none";
    }

    if( Graphics.mouseOverButton ) {
      buttonElement.style.backgroundColor = "#555555";
    }
    else {
      buttonElement.style.backgroundColor = "#0072BC";
    }

    if( isError ) {
      //$( "#message" ).css( {"background-color":"#AA0000"} );
      messageElement.style.backgroundColor = "#AA0000";
      messageElement.style.color = "#FFFFFF";
    }
    else {
      //$( "#message" ).css( {"background-color":"#EEE"} );
      messageElement.style.backgroundColor = "#EEE";
      messageElement.style.color = "#555555";
    }
  },

  onMouseOver : function() {
    Graphics.mouseOverButton = true; 
    Graphics.updateMessage();
  },
  onMouseOut : function() {
    Graphics.mouseOverButton = false; 
    Graphics.updateMessage();
  },

  updateMessage : function() {
    var buttonElement = document.getElementById( "checkButton" );
    if( Graphics.mouseOverButton ) {
      buttonElement.style.backgroundColor = "#555555";
    }
    else {
      buttonElement.style.backgroundColor = "#0072BC";
    }

  }

};
