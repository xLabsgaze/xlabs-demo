///////////////////////////////////////////////////////////////////////////////
// A window of history of some error variable (binary).
// I don't want to have an arbitrarily large structure so time series values
// are binned.
///////////////////////////////////////////////////////////////////////////////
function History( nbrBins, timePerBin, thresholdHi, thresholdLo ) {
  this.nbrBins = nbrBins;
  this.timePerBin = timePerBin;
  this.sums   = new Array( nbrBins );
  this.counts = new Array( nbrBins );
  this.newBin = 0;
  this.thresholdHi = thresholdHi;
  this.thresholdLo = thresholdLo;
  //this.sum = 0;
  //this.count = 0;
  this.mean = 0;
  this.error = false;
  this.t1 = 0;
  this.mask = true;

  this.reset = function() {
    for( var i = 0; i < this.nbrBins; ++i ) {
      this.sums  [ i ] = 0;
      this.counts[ i ] = 0;
    }
    this.t1 = 0;
    this.newBin = 0;
  };

  this.hasError = function() {
    return this.error;
  };

  this.updateError = function() {
    //console.log( "err =" + this.error );
    if( this.error ) {
      if( this.mean < this.thresholdLo ) {
        this.error = false;
        console.log( "err off" );
      }
    }
    else { // no error
      if( this.mean > this.thresholdHi ) {
        this.error = true;
        //console.log( "err on" );
      }
    } 
  };

  this.updateMean = function() {
    var sum = 0;
    var count = 0;
    for( var i = 0; i < this.nbrBins; ++i ) {
      sum   = sum   + this.sums  [ i ];
      count = count + this.counts[ i ];
    }

    if( count == 0 ) {
      this.mean = 0;
    }
    else {    
      this.mean = sum / count;
    }
  };

  this.getMean = function() {
    return this.mean;
  };

  this.next = function() {
    this.newBin = this.newBin +1;
    if( this.newBin >= this.nbrBins ) {
      this.newBin = 0;
    }
    this.sums  [ this.newBin ] = 0;
    this.counts[ this.newBin ] = 0;
  };
  
  this.update = function( value ) {
    var t2 = new Date().getTime();
    var dt = t2 - this.t1;
  
    if( dt > this.timePerBin ) {
      this.next();
      this.t1 = t2;
    }

    // add to youngest bin
    if( value ) {
      this.sums[ this.newBin ] = this.sums[ this.newBin ] +1;
    }
    this.counts[ this.newBin ] = this.counts[ this.newBin ] +1;
    //console.log( "sum = " + this.sums[ this.newBin ]  + " count="+ this.counts[ this.newBin ] );
    this.updateMean();
    this.updateError();
  };

  this.reset();
}