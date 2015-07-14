///////////////////////////////////////////////////////////////////////////////////////////////////
// Error and warning detection with debouncing and easy handling of multiple error conditions.
//
// New model: Time is measured in blocks of ?0.5s?. Window is N blocks.
// If > T% of the window is error then error.
//
///////////////////////////////////////////////////////////////////////////////////////////////////
var Errors = {

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // ERROR PARAMETERS 
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Error is now set to 40% of a 3.9 second window.
  FREQUENCY_THRESHOLD_HI : 0.4, // error turns ON only at 0.4
  FREQUENCY_THRESHOLD_LO : 0.2, // error turns OFF only when it has reached 0.1
  FREQUENCY_THRESHOLD_LO2 : 0.3, // error turns OFF at 
  //LEARNING_RATE : 0.1, // debouncing of errors
  BINS : 8, // 13 * 300 = 3900 milliseconds ie 4 second window
  TIME_PER_BIN : 300, // @ 10 FPS = 3 samples per bin, @ 15 FPS 5 samples per bin, @ 20 FPS 6 samples 

  MESSAGE_FACE   : "Can't see a face.",
  MESSAGE_POSE   : "Bad pose: Centre your face in the camera image.",
  MESSAGE_TRACK  : "Tracking suspended.",
  MESSAGE_SIZE   : "Low resolution / face too small.",
  MESSAGE_DARK   : "Too dark! (reduces accuracy).",
  MESSAGE_BRIGHT : "Too bright! (reduces accuracy).",
  MESSAGE_UNEVEN : "Uneven lighting (reduces accuracy).",
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // ERROR PARAMETERS 
  ///////////////////////////////////////////////////////////////////////////////////////////////////
  errorMessage : "",
  warningMessage : "",

  historyTrack : null,
  historyFace : null,
  historyPose : null,

  historySize : null,
  historyDark : null,
  historyBright : null,
  historyUneven : null,

  hasNoFace : function() {
    if( Errors.historyFace.hasError() ) {
      return true;
    }
    return false;
  },

  hasBadTrack : function() {
    if( Errors.historyTrack.hasError() ) {// Errors.history( Errors.historyTrack.getMean() ) ) {
      return true;
    }
    return false;
  },

  hasBadPose : function() {
    return Errors.distanceThreshold( Errors.xHead, Errors.yHead, Errors.dHeadThreshold );
  },
  hasBadPoseX : function() {
    return Errors.distanceThreshold( Errors.xHead, Errors.yHeadIdeal, Errors.dHeadThreshold );
  },
  hasBadPoseY : function() {
    return Errors.distanceThreshold(          0.0, Errors.yHead     , Errors.dHeadThreshold );
  },

  xHead : 0.0,
  yHead : 0.0,
  yHeadIdeal : -0.5, // was:0.0
  dHeadThreshold : 0.7,

  getPoseError : function() {
    var dx = Errors.xHead;
    var dy = Errors.yHead - Errors.yHeadIdeal;
    var dxy = { x: dx, y: dy };
    return dxy;
  },

  distanceThreshold : function( xh, yh, threshold ) {
    var d = Util.distance( 0.0, Errors.yHeadIdeal, xh, yh );
    if( d > threshold ) {
      return true;
    }
    return false;
  },

  update : function() {
    Errors.xHead = parseFloat( xLabs.getConfig( "state.head.x" ) );
    Errors.yHead = parseFloat( xLabs.getConfig( "state.head.y" ) );
    var trackingSuspended = parseInt( xLabs.getConfig( "state.trackingSuspended" ) );
    var calibrationStatus = parseInt( xLabs.getConfig( "calibration.status" ) );
    var errors = xLabs.getConfig( "validation.errors" );

    // build a prioritized error/warning message string:
    // Face detection
    var error = 0.0;
    if( errors.indexOf( "F" ) >= 0 ) {
      error = 1.0;
    }
    Errors.historyFace.update( error );// = Util.lerp( Errors.historyFace, error, Errors.LEARNING_RATE );

    // Tracking
    error = 0.0;
    if( trackingSuspended > 0 ) {
      error = 1.0;
    }
    Errors.historyTrack.update( error );// = Util.lerp( Errors.historyTrack, error, Errors.LEARNING_RATE );

    // Pose (centred in camera)
    error = 0.0;
    if( Errors.hasBadPose() ) {
      error = 1.0;
    }
    Errors.historyPose.update( error );// = Util.lerp( Errors.historyPose, error, Errors.LEARNING_RATE );

    // Size/resolution
    error = 0.0;
    if( errors.indexOf( "R" ) >= 0 ) {
      error = 1.0;
    }
    Errors.historySize.update( error );// = Util.lerp( Errors.historySize, error, Errors.LEARNING_RATE );

    // Uneven lighting
    error = 0.0;
    if( errors.indexOf( "U" ) >= 0 ) {
      error = 1.0;
    }
    Errors.historyUneven.update( error );// = Util.lerp( Errors.historyUneven, error, Errors.LEARNING_RATE );

    // Bright
    error = 0.0;
    if( errors.indexOf( "B" ) >= 0 ) {
      error = 1.0;
    }
    Errors.historyBright.update( error );// = Util.lerp( Errors.historyBright, error, Errors.LEARNING_RATE );

    // Dark
    error = 0.0;
    if( errors.indexOf( "D" ) >= 0 ) {
      error = 1.0;
    }
    Errors.historyDark.update( error );// = Util.lerp( Errors.historyDark, error, Errors.LEARNING_RATE );
    //console.log( "Err track = "+ Errors.historyTrack.hasError() + " val="+Errors.historyTrack.getMean() );

    // Now all errors are updated, 
    // prioritize errors:
    Errors.setErrorMessage();
  },

  hasError : function() {
    if( Errors.errorMessage.length > 0 ) {
      return true;
    }
    return false;
  },

  setErrorMask : function( includeFace, includePose, includeTrack ) {
    Errors.historyFace.mask = includeFace;
    Errors.historyPose.mask = includePose;
    Errors.historyTrack.mask = includeTrack;
  },

  setErrorMessage : function( includeFace, includePose, includeTrack ) {
    Errors.errorMessage = Errors.getErrorMessage( Errors.historyFace.mask, Errors.historyPose.mask, Errors.historyTrack.mask );
  },

  getErrorMessage : function( includeFace, includePose, includeTrack ) {

    if( includeFace && Errors.historyFace.hasError() ) { //Errors.history( Errors.historyFace.getMean() ) ) {
      return Errors.MESSAGE_FACE;//"Can't see a face.";
    }

    if( includePose && Errors.historyPose.hasError() ) { //Errors.history( Errors.historyPose.getMean() ) ) { // have a face, but not tracking
      return Errors.MESSAGE_POSE;//"Bad pose: Centre your face in the camera image.";
    }

    if( includeTrack && Errors.historyTrack.hasError() ) { //Errors.history( Errors.historyTrack.getMean() ) ) { // have a face, but not tracking
      return Errors.MESSAGE_TRACK;//"Tracking suspended.";
    }

    return "";
  },

  setup : function() {
    Errors.historyTrack = new History( Errors.BINS, Errors.TIME_PER_BIN, Errors.FREQUENCY_THRESHOLD_HI, Errors.FREQUENCY_THRESHOLD_LO2 ); // more responsive, less hysteresis
    Errors.historyFace  = new History( Errors.BINS, Errors.TIME_PER_BIN, Errors.FREQUENCY_THRESHOLD_HI, Errors.FREQUENCY_THRESHOLD_LO );
    Errors.historyPose  = new History( Errors.BINS, Errors.TIME_PER_BIN, Errors.FREQUENCY_THRESHOLD_HI, Errors.FREQUENCY_THRESHOLD_LO );

    Errors.historySize   = new History( Errors.BINS, Errors.TIME_PER_BIN, Errors.FREQUENCY_THRESHOLD_HI, Errors.FREQUENCY_THRESHOLD_LO );
    Errors.historyDark   = new History( Errors.BINS, Errors.TIME_PER_BIN, Errors.FREQUENCY_THRESHOLD_HI, Errors.FREQUENCY_THRESHOLD_LO );
    Errors.historyBright = new History( Errors.BINS, Errors.TIME_PER_BIN, Errors.FREQUENCY_THRESHOLD_HI, Errors.FREQUENCY_THRESHOLD_LO );
    Errors.historyUneven = new History( Errors.BINS, Errors.TIME_PER_BIN, Errors.FREQUENCY_THRESHOLD_HI, Errors.FREQUENCY_THRESHOLD_LO );
  }

};
