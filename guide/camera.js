
// Need a camera object to retain the stream of the camera to clean it up properly in Chrome :(
var Camera = {

  show : function() {
    document.getElementById( "video" ).style.display="block";
    xLabs.setConfig( "frame.stream.preview", "1" );
  },

  hide : function() {
    xLabs.setConfig( "frame.stream.preview", "0" );
    document.getElementById( "video" ).style.display="none";
  }

};

