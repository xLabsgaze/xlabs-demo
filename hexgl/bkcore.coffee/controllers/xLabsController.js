
xLabsController = {
    roll : 0, 
    isFaceDetected : true,
    autoAcc : true,
    breakPointsX : [-1.0,-0.8,-0.5,0,0.5,0.8,1.0],
    breakPointsY : [-1.0,-0.8,-0.5,0,0.5,0.8,1.0],
    setupDone : false,

    onReady : function() {
        document.getElementById("step-1").style.display = "block";

        console.log( "xLabsController.onReady()" )
        xLabs.setConfig( "system.mode", "head" );
        xLabs.setConfig( "browser.canvas.paintHeadPose", "0" );
        
        // xLabsController.isReady = true;
    },
    onUpdate : function() {
        // console.log( "xLabsController.onUpdate()" )
        xLabsController.roll = xLabs.getConfig( "state.head.roll" );
    },
    setup : function() {
        if( !xLabsController.setupDone ) {
            console.log( "xLabsController.setup()" )
            xLabsController.setupDone = true;
            if( !xLabs.extensionVersion() ) {
                document.getElementById("extension-check").style.display = "block";
            }
            else {
                xLabs.setup( xLabsController.onReady, xLabsController.onUpdate, null, "myToken" );
            }
        }
    },
    close : function() {
        xLabs.setConfig( "system.mode", "off" );
    },
    convertValue : function(value) {
        var result;
        if(value>0){
            result =  1/ (1+Math.pow(Math.E,(-(8*(value-0.5))) ));  //'e^(-(14（x-0.5）))'
        }
        else{
            result= - 1/ (1+Math.pow(Math.E,(-(8*(-value-0.5))) ));
        }
        return result;
    },
    convertValue2 : function(input, breakPointsX, breakPointsY) {
        if (input>breakPointsX[breakPointsX.length-1]){
            return breakPointsY[breakPointsY.length-1];
        }
        else if(input<breakPointsX[0]){
            return breakPointsY[0];
        }
        else{
            for(var i = 0; i<breakPointsX.length; i++){
                if(input>=breakPointsX[i] && input<breakPointsX[i+1]){
                    p = (breakPointsY[i+1]-breakPointsY[i]) / (breakPointsX[i+1]-breakPointsX[i]);
                    return input*p;
                }
            }
        }
    }
}

$(window).bind("beforeunload", function() {
    xLabs.setConfig( "system.mode", "off" );
})

xLabsController.setup();
