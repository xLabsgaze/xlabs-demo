
///////////////////////////////////////////////////////////////////////////////
// A simple state engine with lazy state changes and a callback on state
// change. Previous (old) state is remembered.
///////////////////////////////////////////////////////////////////////////////
function State( states, state, onStateChanged ) {
  this.states = states;
  this.state = state;
  this.stateOld = state;
  this.onStateChanged = onStateChanged;
  this.getState = function() {
    return this.state;
  };
  this.getStateOld = function() {
    return this.stateOld;
  };
  this.setState = function( state ) {
    if( this.state == state ) {
      return; // dont set if unchanged
    }

    this.stateOld = this.state;
    this.state = state;

    //console.log( "State changed from: " + this.stateOld + " to: " + state );

    if( this.onStateChanged != null ) {
      this.onStateChanged();
    }
  };
  this.setStateOld = function() {
    this.setState( this.stateOld ); // ie go back or undo
  };
  this.setStatePrev = function() {
    var stateNew = Math.max( 0, this.state -1 );  
    this.setState( stateNew );
  };
  this.setStateNext = function() {
    var stateNew = Math.min( this.states -1, this.state +1 );  
    this.setState( stateNew );
  }
};

