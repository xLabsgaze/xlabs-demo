/**
 * @author Yikai Gong
 */

var visitor;

function main(){
    if(Detector.webgl){
        visitor = new xLabs.Visitor();
        visitor.init();
        visitor.start();
    }
    else{
        alert('Sorry, your browser does not support WebGL');
    }
}