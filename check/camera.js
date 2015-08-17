var Camera = {

  allowCamera : AllowCamera(),

  show : function() {
    document.getElementById( "debugContainer" ).style.display="block";
    document.getElementById( "debugContainer2" ).style.display="block";
    document.getElementById( "video" ).style.display="inline-block";
    document.getElementById( "debug" ).style.display="block";
    xLabs.setConfig( "frame.stream.preview", "1" );
    Camera.allowCamera.show( document.getElementById( "xLabsPreview" ) )
  },

  hide : function() {
    xLabs.setConfig( "frame.stream.preview", "0" );
    document.getElementById( "debugContainer" ).style.display="none";
    document.getElementById( "debugContainer2" ).style.display="none";
    document.getElementById( "video" ).style.display="none";
    document.getElementById( "debug" ).style.display="none";
    allowCamera.hide() // It'll call hide when the camera is allowed anyway.
  }


};
