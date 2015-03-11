
///////////////////////////////////////////////////////////////////////////////////////////////////
// Error and warning detection with debouncing and easy handling of multiple error conditions.
///////////////////////////////////////////////////////////////////////////////////////////////////
var Errors = {

  FREQUENCY_THRESHOLD : 0.15, // this is for UI control but is pretty OK for any machine
  LEARNING_RATE : 0.1, // debouncing of errors

  MESSAGE_FACE   : "Can't see a face.",
  MESSAGE_POSE   : "Bad pose: Centre your face in the camera image.",
  MESSAGE_TRACK  : "Tracking suspended.",
  MESSAGE_SIZE   : "Low resolution / face too small.",
  MESSAGE_DARK   : "Too dark! (reduces accuracy).",
  MESSAGE_BRIGHT : "Too bright! (reduces accuracy).",
  MESSAGE_UNEVEN : "Uneven lighting (reduces accuracy).",

  errorMessage : "",
  warningMessage : "",

  freqErrorTrack : 0.0,
  freqErrorFace : 0.0,
  freqErrorPose : 0.0,

  freqWarningSize : 0.0,
  freqWarningDark : 0.0,
  freqWarningBright : 0.0,
  freqWarningUneven : 0.0,

  hasError : function() {
    if( Errors.errorMessage.length > 0 ) {
      return true;
    }
    return false;
  },

  hasErrorExcludingTracking : function() {
    if( Errors.errorMessage.length > 0 ) {
      if( Errors.errorMessage == Errors.MESSAGE_TRACK ) {
        return false;
      }

      return true;
    }
    return false;
  },

  hasErrorExcludingPose : function() {
    if( Errors.errorMessage.length > 0 ) {
      if( Errors.errorMessage == Errors.MESSAGE_POSE ) {
        return false;
      }

      return true;
    }
    return false;
  },

  hasWarning : function() {
    if( Errors.warningMessage.length > 0 ) {
      return true;
    }
    return false;
  },

  hasNoFace : function() {
    if( Errors.freqError( Errors.freqErrorFace ) ) {
      return true;
    }
    return false;
  },

  hasBadTrack : function() {
    if( Errors.freqError( Errors.freqErrorTrack ) ) {
      return true;
    }
    return false;
  },

  hasBadPose : function() {
    var x = parseFloat( xLabs.getConfig( "state.head.x" ) );
    var y = parseFloat( xLabs.getConfig( "state.head.y" ) );
    var t = parseFloat( xLabs.getConfig( "algorithm.validation.headCentreDistanceThreshold" ) );
    return Errors.distanceThreshold( x, y, t );
  },
  hasBadPoseX : function() {
    var x = parseFloat( xLabs.getConfig( "state.head.x" ) );
    var t = parseFloat( xLabs.getConfig( "algorithm.validation.headCentreDistanceThreshold" ) );
    return Errors.distanceThreshold( x, 0.0, t );
  },
  hasBadPoseY : function() {
    var y = parseFloat( xLabs.getConfig( "state.head.y" ) );
    var t = parseFloat( xLabs.getConfig( "algorithm.validation.headCentreDistanceThreshold" ) );
    return Errors.distanceThreshold( Errors.yHeadIdeal, y, t );
  },

  yHeadIdeal : -0.5,

  freqError : function( frequency ) {
//    var threshold = 0.15; // e.g. 0.15 = 15%
    if( frequency > Errors.FREQUENCY_THRESHOLD ) {
      return true;
    }
    return false;
  },

  distanceThreshold : function( xh, yh, threshold ) {
    var d = Util.distance( 0.0, Errors.yHeadIdeal, xh, yh );
    if( d > threshold ) {
      return true;
    }
    return false;
  },

  update : function() {
    var trackingSuspended = parseInt( xLabs.getConfig( "state.trackingSuspended" ) );
    var calibrationStatus = parseInt( xLabs.getConfig( "calibration.status" ) );
    var errors = xLabs.getConfig( "validation.errors" );

    // build a prioritized error/warning message string:
    // Face detection
    var error = 0.0;
    if( errors.indexOf( "F" ) >= 0 ) {
      error = 1.0;
    }
    Errors.freqErrorFace = Util.lerp( Errors.freqErrorFace, error, Errors.LEARNING_RATE );

    // Tracking
    error = 0.0;
    if( trackingSuspended > 0 ) {
      error = 1.0;
    }
    Errors.freqErrorTrack = Util.lerp( Errors.freqErrorTrack, error, Errors.LEARNING_RATE );

    // Pose (centred in camera)
    error = 0.0;
    if( Errors.hasBadPose() ) {
      error = 1.0;
    }
    Errors.freqErrorPose = Util.lerp( Errors.freqErrorPose, error, Errors.LEARNING_RATE );

    // Size/resolution
    error = 0.0;
    if( errors.indexOf( "R" ) >= 0 ) {
      error = 1.0;
    }
    Errors.freqWarningSize = Util.lerp( Errors.freqWarningSize, error, Errors.LEARNING_RATE );

    // Uneven lighting
    error = 0.0;
    if( errors.indexOf( "U" ) >= 0 ) {
      error = 1.0;
    }
    Errors.freqWarningUneven = Util.lerp( Errors.freqWarningUneven, error, Errors.LEARNING_RATE );

    // Bright
    error = 0.0;
    if( errors.indexOf( "B" ) >= 0 ) {
      error = 1.0;
    }
    Errors.freqWarningBright = Util.lerp( Errors.freqWarningBright, error, Errors.LEARNING_RATE );

    // Dark
    error = 0.0;
    if( errors.indexOf( "D" ) >= 0 ) {
      error = 1.0;
    }
    Errors.freqWarningDark = Util.lerp( Errors.freqWarningDark, error, Errors.LEARNING_RATE );

    // prioritize errors:
    var errorMessage = "";
    if( Errors.freqError( Errors.freqErrorFace ) ) {
      errorMessage = Errors.MESSAGE_FACE;//"Can't see a face.";
    }
    else if( Errors.freqError( Errors.freqErrorPose ) ) { // have a face, but not tracking
      errorMessage = Errors.MESSAGE_POSE;//"Bad pose: Centre your face in the camera image.";
    }
    //else if( calibrationStatus == 0 ) { // have a face, but not tracking. This doesn't change fast so no smoothing
    //  errorMessage = "Not yet calibrated.";
    //}
    else if( Errors.freqError( Errors.freqErrorTrack ) ) { // have a face, but not tracking
      errorMessage = Errors.MESSAGE_TRACK;//"Tracking suspended.";
    }

    // prioritize warnings:
    var warningMessage = "";

    if( Errors.freqError( Errors.freqWarningSize ) ) {
      warningMessage = Errors.MESSAGE_SIZE;//"Low resolution / face too small.";
    }
    else if( Errors.freqError( Errors.freqWarningDark ) ) { // have a face, but not tracking
      warningMessage = Errors.MESSAGE_DARK;//"Too dark! (reduces accuracy).";
    }
    else if( Errors.freqError( Errors.freqWarningBright ) ) { // have a face, but not tracking. This doesn't change fast so no smoothing
      warningMessage = Errors.MESSAGE_BRIGHT;//"Too bright! (reduces accuracy).";
    }
    else if( Errors.freqError( Errors.freqWarningUneven ) ) { // have a face, but not tracking
      warningMessage = Errors.MESSAGE_UNEVEN;//"Uneven lighting (reduces accuracy).";
    }

    Errors.errorMessage = errorMessage;
    Errors.warningMessage = warningMessage;
  }

};



