///////////////////////////////////////////////////////////////////////////////
// Interactive calibration mode: You play a game to get some detailed
// calibration data.
// var myTimer = new xLabsTimer();
// myTimer.reset();
// myTimer.startTime = x;
///////////////////////////////////////////////////////////////////////////////
function Timer() {
  this.startTime = 0;
  this.duration = 0;
  this.reset = function() {
    var time = new Date().getTime();
    this.startTime = time;
  };
  this.elapsed = function() {
    var time = new Date().getTime();
    if( time < this.startTime ) {
      return 0;
    }
    var elapsedTime = time - this.startTime;
    return elapsedTime;
  };
  this.setDuration = function( duration ) {
    this.duration = duration;
  };
  this.elapsedFrac = function() {
    var time = new Date().getTime();
    if( time < this.startTime ) {
      return 0.0; // not yet started
    }
    if( this.duration <= 0.0 ) {
      return 1.0;
    }
    var elapsedTime = time - this.startTime;
    var elapsedFrac = elapsedTime / this.duration;
    return elapsedFrac;
  };
  this.hasElapsed = function() {
    if( this.elapsedFrac() >= 1.0 ) {
      return true;
    }
    return false;
  };
  this.reset();
}

