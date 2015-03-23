/**
 * @author Yikai Gong
 */

var visitor;

function main(){
    self = this

    if( !xLabs.extensionVersion() ) {
        document.getElementById("extension-check").style.display = "block";
        document.getElementById("loading").style.display = "none";
        return;
    }

    if(Detector.webgl){
        visitor = new xLabs.Visitor();
        visitor.init();
        visitor.start();
    }
    else{
        alert('Sorry, your browser does not support WebGL');
    }
}