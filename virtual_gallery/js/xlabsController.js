/**
 * @author Yikai Gong
 */

// constants
var faceDetectedAlpha  = 0.7;
var faceDetectedThresh = 0.3;

// Mark and space time for showing display
var displayHelpMarkMsec = 4000;
var displayHelpSpaceMsec = 15000;
var displayHelpWhenNoFace = true;

var maxWalkSpeed = 0.00035;

// For pitch control
var ySmoothAlpha = 0.5;
var pitchSignalsMaxLength = 50; // the length of the face y position buffer, the median of this buffer is the reference
var pitchSignalLockoutMsec = 1500; // amount of time to ignore other pitch events after a pitch even have occured
var pitchNumUpdates = 30; // controls the amount of pitch per pitch event, larger means more pitch movement
 
var xLabs= xLabs || {};
xLabs.mode = 2;   //0:roll, 1:yaw, 2:positionX
xLabs.webCamController = function(){
    var self = this;
    this.headX = 0;
    this.headX = 0;
    this.headX = 0;
    this.roll = 0;
    this.pitch = 0;
    this.yaw  = 0;
    this.isFaceDetected = false;
    xLabs.setup( function(){ self.onApiReady(); }, function(){ self.onApiState(); }, null, "myToken" );
}

xLabs.webCamController.prototype = {

	// variables
	yawSmooth : 0,
	xSmooth : 0,
	ySmooth : 0,
	
	targetPitchRate : 0,	
	pitchUpdateCnt : 0, // counts the number of updates so we can control the amount of pitch
	pitchEventTimeMsec : 0,
	pitchSignals : [],
	
	CONTROL_MODE_ROLL : 0,
	CONTROL_MODE_YAW : 1,
	CONTROL_MODE_X : 2,
	
	helpOverlay : null,
	isFaceDetected : false,
	lastHelpTimeMsec : 0,
	
	
    onApiState : function(){
        Errors.update();
        this.headX = xLabs.getConfig( "state.head.x" );
        this.headY = xLabs.getConfig( "state.head.y" );
        this.headZ = xLabs.getConfig( "state.head.z" );
        this.roll  = xLabs.getConfig( "state.head.roll" );
        this.pitch = xLabs.getConfig( "state.head.pitch" );
        this.yaw   = xLabs.getConfig( "state.head.yaw" );
        this.isFaceDetected = !Errors.hasNoFace();
    },
    onApiReady : function(){
        window.addEventListener( "beforeunload", function() {
            xLabs.setConfig( "system.mode", "off" );
        });
        xLabs.setConfig( "system.mode", "head" );
        xLabs.setConfig( "browser.canvas.paintHeadPose", "0" );
    },
    close : function(){
        xLabs.setConfig( "system.mode", "off" );
    },

	setOpacityWithFade : function( element, targetOpacity, step ) {
		var opacity = parseFloat( element.style.opacity );
		
		opacity = smoothAcc( opacity, targetOpacity, step );
		element.style.opacity = opacity;
		
		if( opacity == 0 ) {
			element.style.display = "none";
		}
		else {
			element.style.display = "block";
		}
	},	
	showHelp : function(faceDetected){
		if( !this.helpOverlay ) {
			this.helpOverlay = document.getElementById('help_overlay');
		}

		// Logic to displaying help
		var now = new Date().getTime();
		var setVisible = 0;
		if( displayHelpWhenNoFace && !faceDetected ) {
			setVisible = 1;
			this.lastHelpTimeMsec = now;
		}
		// else {
		// 	if( now - this.lastHelpTimeMsec > displayHelpSpaceMsec ) {
		// 		setVisible = 1;
		// 	}
		// 	if( now - this.lastHelpTimeMsec > displayHelpSpaceMsec + displayHelpMarkMsec ) {
		// 		setVisible = 0;
		// 		this.lastHelpTimeMsec = now;
		// 	}
		// }
		
		// Fade in
		if( setVisible ) this.setOpacityWithFade( this.helpOverlay, 0.7, 0.05 );
		else 			 this.setOpacityWithFade( this.helpOverlay, 0.0, 0.05 );		
	},	
	
    update : function(callback){
		var walkSpeed = maxWalkSpeed;
	
		this.showHelp( this.isFaceDetected );

//		console.log( "this.isFaceDetected: " + this.isFaceDetected );
//  	  console.log( "this.headZ: " + this.headZ );
		if( !this.isFaceDetected ) {
			walkSpeed = 0;			
			callback( 0, 0,  walkSpeed );
			return;
		}
//        console.log(this.pitch);
		// mode:
		// 0 -- roll
		// 0 -- yaw
		// 0 -- head x
        var yawRate = 0;
        if(xLabs.mode===this.CONTROL_MODE_ROLL) {
//            yawRate = mapIntoW(this.roll, 0.17, 5);
		}
        else if(xLabs.mode===this.CONTROL_MODE_YAW) {
			var alpha = 0.9;
			this.yawSmooth = this.yawSmooth * alpha + (1-alpha) * this.yaw;
			var gain = 16;
			var yawMin = 0.04;
			var yawMax = 0.1;
			//console.log( "this.yawSmooth: " + this.yawSmooth );
            yawRate = mapIntoW( this.yawSmooth, gain, yawMin, yawMax );
		}
        else if(xLabs.mode===this.CONTROL_MODE_X) {
			var alpha = 0.5;
			this.xSmooth = this.xSmooth * alpha + (1-alpha) * this.headX;
			var gain = 1.0*0.75;
			var xMin = 0.2*0.75;
			var xMax = 1.5*0.75;
			//console.log( "this.xSmooth: " + this.xSmooth );
            yawRate = mapIntoW( this.xSmooth, gain, xMin, xMax );
		}
	
		// Control pitch
		{
			this.ySmooth = this.ySmooth * ySmoothAlpha + (1- ySmoothAlpha) * this.headY;
			
			// Maintain a buffer of pitch signals
			this.pitchSignals.push( this.ySmooth );
			if( this.pitchSignals.length > pitchSignalsMaxLength ) {
				this.pitchSignals.shift();
			}
			
			// Get the median value as a reference
			var pitchRef  = median( this.pitchSignals );
			var pitchSig = this.ySmooth - pitchRef;
			var pitchThresh = 0.25;
//			console.log( "pitchSig: " + pitchSig );
			var nowMsec = new Date().getTime();
			
			// No more pitch event within the lockout period just after a pitch event
			if( nowMsec - this.pitchEventTimeMsec > pitchSignalLockoutMsec ) {
				var pitchRate = 0;
				
				if( pitchSig > pitchThresh ) {
					pitchRate = -0.8;
				}
				else if( pitchSig < -pitchThresh ) {
					pitchRate = 0.8;
				}
				
				if( pitchRate != 0 ) {				
					this.pitchEventTimeMsec = new Date().getTime();
					this.targetPitchRate = pitchRate;
					this.pitchUpdateCnt = window.pitchNumUpdates;
				}
			}
			
			// See if we need to stop pitch movement
			if( this.pitchUpdateCnt == 0 ) {
				this.targetPitchRate = 0;
			}
			else {
				this.pitchUpdateCnt -= 1;
			}
			
		}		

        callback( yawRate, this.targetPitchRate,  walkSpeed );
    }
}

function median( _values ) {
	// Make a shallow copy, which should be enough since
	// we don't modify the elements
	var values = _values.slice(0);
	
    values.sort( function(a,b) {return a - b;} );
    var half = Math.floor(values.length/2);

    if(values.length % 2)
        return values[half];
    else
        return (values[half-1] + values[half]) / 2.0;
}


function mapIntoW( _input, gain, inputMin, inputMax ) {
	var w = 0;
	var input = _input;

	if( input >  inputMax ) input =  inputMax;
	if( input < -inputMax ) input = -inputMax;
	
	if( input >  inputMin ) w = (input - inputMin) * gain;
	if( input < -inputMin ) w = (input + inputMin) * gain;
	
//	console.log( "w:" + w );
	return w;
}

function mapTOP(input, t1, t2, k){
    var result = 0;
    if(input < t1)
        result = k;
    else if(input>t2)
        result = -k;
    return result;
}

function smoothAcc( curr, target, step ) {
	if( curr != target ) {
		if( curr > target ) {
			curr -= step;
			if( curr < target ) curr = target;
		}
		else if( curr < target ) {
			curr += step;
			if( curr > target ) curr = target;
		}
	}
	return curr;
}

