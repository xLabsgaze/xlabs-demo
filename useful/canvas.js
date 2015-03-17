
///////////////////////////////////////////////////////////////////////////////
// A fullscreen graphical canvas for calib UI
///////////////////////////////////////////////////////////////////////////////
var Canvas = {

  element : null,
  context : null,
  paintCallback : null,

  show : function() {
    if( Canvas.element.style.display != "block" ) {
      Canvas.element.style.display = "block";
    }
  },
  hide : function() {
    if( Canvas.element.style.display != "none" ) {
      Canvas.element.style.display = "none";
    }
  },

  resize : function() {
    var devicePixelRatio = xLabs.devicePixelRatio();
    if( !devicePixelRatio && xLabs.extensionVersion() ) {
      console.log( 'xLabs.devicePixelRatio() not ready, will check again' );
      setTimeout( Canvas.resize, 100 ); // check again till it's valid
      return;
    }
    //console.log( "Resizing overlay canvas" );
    Canvas.element.width  = (window.innerWidth +0) * devicePixelRatio;
    Canvas.element.height = (window.innerHeight+0) * devicePixelRatio;
    Canvas.element.style.width  = window.innerWidth +0 + "px";
    Canvas.element.style.height = window.innerHeight+0 + "px";
  },

  setTimeout : function() {
    var interval = 500; // slow
    var intervalFocus = xLabs.getConfig( "browser.canvas.intervalFocus" );
    var intervalBlur  = xLabs.getConfig( "browser.canvas.intervalBlur" );

    if( !document.webkitHidden ) {
      if( intervalFocus.length > 0 ) {
        interval = parseInt( intervalFocus );
      }
    }
    else {
      if( intervalBlur.length > 0 ) {
        interval = parseInt( intervalBlur );
      }
    }

    setTimeout( Canvas.paint, interval );
  },

  paint : function() { 

    Canvas.setTimeout(); // schedule next repaint

    if( document.webkitHidden ) {
      Canvas.hide();
      return;
    }

    if( Canvas.paintCallback != null ) {
      Canvas.paintCallback();
    }
  },

  setCaptureMouse : function( captureMouse ) {
    if( captureMouse ) {
      Canvas.addClass( Canvas.element, 'allow-pointer' );
    }
    else {
      Canvas.removeClass( Canvas.element, 'allow-pointer' );
    }
  },

  hasClass : function( element, elementClass ) {
    return element.className.match(new RegExp('(\\s|^)'+elementClass+'(\\s|$)'));
  },

  addClass : function( element, elementClass ) {
    if( !Canvas.hasClass( element, elementClass ) ) {
      element.className += " "+elementClass;
    }
  },

  removeClass : function( element, elementClass ) {
    if( Canvas.hasClass( element,elementClass ) ) {
      var reg = new RegExp('(\\s|^)'+elementClass+'(\\s|$)');
      element.className = element.className.replace( reg, ' ' );
    }
  },

  clear : function() {
    Canvas.context.clearRect( 0, 0, Canvas.element.width, Canvas.element.height );
  },

  add : function() {
    // canvas element (usually invisible graphical overlay)
    Canvas.element = document.createElement( 'canvas' );
    Canvas.element.setAttribute( "id", "xLabsAppCanvas" );
    Canvas.element.setAttribute( "width",  screen.width  );//window.innerWidth);
    Canvas.element.setAttribute( "height", screen.height );//window.innerHeight);
    Canvas.element.setAttribute( "style", "background:0" );//window.innerHeight);
    Canvas.context = Canvas.element.getContext( "2d" );

    // add these UI tools to the document:	
    var style = document.createElement( 'style' ), // style - positions the canvas element and makes it 'click throughable' 
    rules = document.createTextNode('html,body{padding:0;margin:0;}#xLabsAppCanvas{pointer-events:none;top:0;left:0;position:fixed;z-index:500;}#xLabsAppCanvas.allow-pointer{pointer-events:auto;}');
    style.type = 'text/css';

    if( style.styleSheet ) {
      style.styleSheet.cssText = rules.nodeValue;
    }
    else {
      style.appendChild( rules );
    }

    var head = document.getElementsByTagName( 'head' )[0];
    head.appendChild( style );
    document.getElementsByTagName('body')[ 0 ].appendChild( Canvas.element );

    // add a painting callback for the canvas:
    window.addEventListener('resize', Canvas.resize );

    Canvas.resize(); // first time
    //Canvas.setCaptureMouse( false );
    Canvas.setTimeout();
  },

  setup : function() {
    Canvas.add();
  }

};

Canvas.setup();

