
///////////////////////////////////////////////////////////////////////////////
// Interactive calibration mode: You play a game to get some detailed 
// calibration data.
///////////////////////////////////////////////////////////////////////////////
var Grid = {

  id : "grid",
  url : null,
  width : 3,
  height : 3,

  timer : null,
  weights : null,
  weightLearningRate : 0.1,
  
  bevel : 0.05,  
  
  selectedTile : null,
  currentTile : null,

  getNbrTiles : function() {
    return Grid.width * Grid.height;
  },

  // on a timer, update weights with the nearest 
  createWeights : function( x, y ) {
    if( Grid.weights == null ) {
      Grid.weights = new Float32Array( Grid.width * Grid.height );
      var gridSize = Grid.width * Grid.height;
      for( var i = 0; i < gridSize; ++i ) { 
        Grid.weights[ i ] = 0;
      }
    }    
  },

  findMaxWeight : function() {
    Grid.createWeights();
    
    var xMax = 0;
    var yMax = 0;
    var wMax = 0;

    for( var y = 0; y < Grid.height; ++y ) { 
      for( var x = 0; x < Grid.width; ++x ) { 
        var i = y * Grid.width +x;
        var w = Grid.weights[ i ];
        if( w > wMax ) {
          xMax = x;
          yMax = y;
          wMax = w;
        }
      }
    }

    return { x: xMax, y: yMax };
  },

  updateWeights : function( xs, ys ) {
    Grid.createWeights();

    xs = parseInt( xs );
    ys = parseInt( ys );

    var a = Grid.weightLearningRate;
    var b = 1.0 - a;

    for( var y = 0; y < Grid.height; ++y ) { 
      for( var x = 0; x < Grid.width; ++x ) { 
        var i = y * Grid.width +x;

        var oneValue = 0.0;
        if( ( x == xs ) && ( y == ys ) ) {
          oneValue = 1.0;
        }

        var oldValue = Grid.weights[ i ];
        var newValue = a * oneValue + b * oldValue;
        Grid.weights[ i ] = newValue;
      }
    }
  },

  selectTileCheck : function( xScreen, yScreen ) {
    if( Grid.timer.hasElapsed() ) {
        Grid.timer.reset();
        Grid.selectTileUpdate( xScreen, yScreen );
    }
  },
  
  selectTileUpdate : function( xScreen, yScreen ) {
    var tile = Grid.findTileNearest( xScreen, yScreen );
    var id = Grid.getTileDivId( tile.x, tile.y );

    Grid.updateWeights( tile.x, tile.y );

    var wMax = Grid.findMaxWeight();
    var idMax = Grid.getTileDivId( wMax.x, wMax.y );

    Grid.updateSelection( id, idMax );
  },

  selectTileNearest : function( xScreen, yScreen ) {
    var tile = Grid.findTileNearest( xScreen, yScreen );
    var id = Grid.getTileDivId( tile.x, tile.y );
    Grid.selectTile( id );
  },

  findTileNearest : function( xScreen, yScreen ) {

    var dMin = screen.width * 2 * 2;
    var xMin = 0;
    var yMin = 0;

    for( y = 0; y < Grid.height; y = y +1 ) {
      for( x = 0; x < Grid.width; x = x +1 ) {
        var tileRect = Grid.getTileRect( x, y );
        var d = Util.rectangleDistance( xScreen, yScreen, tileRect.x, tileRect.y, tileRect.w, tileRect.h );  
        if( d < dMin ) {
          dMin = d;
          xMin = x;
          yMin = y;
        }
      }
    }    

    var tile = { x: xMin, y: yMin };
    return tile;
    var id = Grid.getTileDivId( xMin, yMin );
    Grid.selectTile( id );
  },

  spacing : 0.1,
  
  getTileOrigin : function() {
    var bevel = window.innerHeight * Grid.bevel;
    var space = window.innerHeight * Grid.spacing;
    var tilesWidth = window.innerHeight - ( bevel * 2 );// - ( space * (Grid.width-1) );
    var tileWidth = tilesWidth / Grid.width;
    var xOrigin = ( window.innerWidth - tilesWidth ) * 0.5;
    var tileOrigin = { x: xOrigin, y: bevel };
    return tileOrigin;
  },

  getTileSize : function() {
    var bevel = window.innerHeight * Grid.bevel;
    var space = window.innerHeight * Grid.spacing;
    var tilesHeight = window.innerHeight - ( bevel * 2 ) - ( space * (Grid.width-1) );
    var tileHeight = tilesHeight / Grid.height;
    var tilesWidth = window.innerHeight - ( bevel * 2 ) - ( space * (Grid.width-1) );
    var tileWidth = tilesWidth / Grid.width;
    var tileSize = { w: tileWidth, h: tileHeight };
    return tileSize;
  },

  endsWith : function( s, suffix ) {
    return s.indexOf( suffix, s.length - suffix.length ) !== -1;
  },

  imageUrl : function( url ) {
    if( Grid.endsWith( url, ".jpeg" ) ) {
      return true;
    }
    if( Grid.endsWith( url, ".jpg" ) ) {
      return true;
    }
    if( Grid.endsWith( url, ".png" ) ) {
      return true;
    }
    if( Grid.endsWith( url, ".gif" ) ) {
      return true;
    }
    return false;
  },

  onClick : function( e ) {
    //alert( "id="+e.target.id );
    //    var did = "div:" + x + "," + y;
    //    var iid = "img:" + x + "," + y;
    var id = e.target.id;
    // console.log( "x,y="+x+","+y );
    var c = Grid.getTileCoord( id );
    var did = Grid.getTileDivId( c.x, c.y );

    Grid.updateSelection( did, did );
  },

  getTileCoord : function( id ) {
    var x = 0;
    var y = 0;
    if( !!id ) {
      var i1 = id.indexOf( ':' )+1;
      var i2 = id.indexOf( ',' )+1;
      var i3 = id.length
      var l1 = i2 - i1 -1;
      var l2 = i3 - i2 +1;
      x = id.substr( i1, l1 );
      y = id.substr( i2, l2 );
    }

    var c = { x: x, y: y };
    return c;
  },

  getTileRect : function( x, y ) {
    var tileOrigin = Grid.getTileOrigin();
    var tileSize = Grid.getTileSize();
    //var top = tileOrigin.y + y * tileSize.h;
    //var left = tileOrigin.x + x * tileSize.w;
    var space = window.innerHeight * Grid.spacing;
    var top = tileOrigin.y + y * (tileSize.h +space);
    var left = tileOrigin.x + x * (tileSize.w +space);
    var z = 10;
    var r = { x: left, y: top, w: tileSize.w, h: tileSize.h, z:z };
    return r;
  },

  getTileDivId : function( x, y ) {
    var did = "div:" + x + "," + y;
    return did;
  },

  updateSelection : function( idCurrent, idSelected ) {
    if(    ( idCurrent  == Grid. currentTile )
        && ( idSelected == Grid.selectedTile ) ) {
      return; // no change
    }

    Grid. currentTile = idCurrent;
    Grid.selectedTile = idSelected;

    for( var y = 0; y < Grid.height; ++y ) { 
      for( var x = 0; x < Grid.width; ++x ) { 
        var id = Grid.getTileDivId( x, y );

        if( id == Grid.selectedTile ) {
          Grid.setStyleSelected( id );
        }
        else if( id == Grid.currentTile ) {
          Grid.setStyleCurrent( id );
        }
        else {
          Grid.setStyleNormal( id );
        }
      }
    }
  },

  setStyleNormal : function( id ) {
    //console.log( "set normal: "+id );
    var imgDiv = document.getElementById( id );
    var c = Grid.getTileCoord( id );     
    var r = Grid.getTileRect( c.x, c.y );
    imgDiv.style.border = "none";
    imgDiv.style.background = "#ffffff";
    imgDiv.style.top = r.y;
    imgDiv.style.left = r.x;
    imgDiv.style.width = r.w;
    imgDiv.style.height = r.h;
    imgDiv.style.zIndex = r.z;
  },

  setStyleCurrent : function( id ) {
    //console.log( "set current: "+id );
    var imgDiv = document.getElementById( id );
    var c = Grid.getTileCoord( id );     
    var r = Grid.getTileRect( c.x, c.y );
    imgDiv.style.border = "1px solid blue";
    imgDiv.style.background = "#ffffff";
    imgDiv.style.top = r.y;
    imgDiv.style.left = r.x;
    imgDiv.style.width = r.w;
    imgDiv.style.height = r.h;
    imgDiv.style.zIndex = r.z;
  },

  setStyleSelected : function( id ) {
    //console.log( "set selected: "+id );
    var imgDiv = document.getElementById( id );
    
    var f = 1.1;    
    var c = Grid.getTileCoord( id );     
    var r = Grid.getTileRect( c.x, c.y );
    var h = r.h * f;
    var w = r.w * f;
    var x = r.x - ((w-r.w)*0.5);
    var y = r.y - ((h-r.h)*0.5);
    imgDiv.style.border = "3px solid red";
    imgDiv.style.background = "#eeeeee";
    imgDiv.style.top = y;
    imgDiv.style.left = x;
    imgDiv.style.width = w;
    imgDiv.style.height = h;
    imgDiv.style.zIndex = 99;
  }, 

  onData : function( json ) {
    //var tileOrigin = Grid.getTileOrigin();
    //var tileSize = Grid.getTileSize();
    var content = "";
    var index = 0;

    for( y = 0; y < Grid.height; y = y +1 ) {
      for( x = 0; x < Grid.width; x = x +1 ) {
        var imgUrl = null;
        var did = Grid.getTileDivId( x, y );
        var iid = "img:" + x + "," + y;
        var r = Grid.getTileRect( x, y );
        //var top = tileOrigin.y + y * tileSize.h;
        //var left = tileOrigin.x + x * tileSize.w;
        //var index = y * Grid.width +x;
        while( !imgUrl ) {
          if( index >= json.data.children.length ) {
            break;
          }
          var url = json.data.children[ index ].data.url;
          if( Grid.imageUrl( url ) ) {
            imgUrl = url;
          }

          index = index +1;
        }
        content = content + "<div class='tile' style='position: absolute; zIndex:10; top: "+r.y+"px; left: "+r.x+"px; width: "+r.w+"px; height: "+r.h+"px;' id='"+did+"' ><img id='"+iid+"' src='"+imgUrl+"' style='align:center; valign:center;max-width:100%; max-height:100%; margin-left: auto; margin-right: auto; display: block;' /></div>";
      }
    }
    var div = document.getElementById( "grid" );
    div.innerHTML = content;

    // add listeners
    for( y = 0; y < Grid.height; y = y +1 ) {
      for( x = 0; x < Grid.width; x = x +1 ) {
        var did = Grid.getTileDivId( x, y );
        var iid = "img:" + x + "," + y;
        var imgDiv = document.getElementById( did );
        imgDiv.addEventListener( "click", Grid.onClick, false );
      }
    }
//    div.innerHTML = JSON.stringify( json.data.children[ 0 ].data.url );
  },

  getData : function() {
    var url = Grid.url;
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function() {
      if( xhr.readyState == 4 && xhr.status == 200 ) {
        var json = JSON.parse( xhr.responseText );
        Grid.onData( json );
      }
      else {
        //alert( "Error: Couldn't query url: "+ url );
      }
    }

    xhr.open( "GET", url, false );
    xhr.send( null );
  },

  hide : function() {
    document.getElementById( Grid.id ).style.display = "none";
  },
  show : function() {
    document.getElementById( Grid.id ).style.display = "block";
  },
  setup : function( url ) {
    Grid.timer = new Timer();
    Grid.timer.setDuration( 100 ); // ~ 10Hz

    Grid.url = url;
    Grid.getData();
  }

};

//Grid.setup( "http://www.reddit.com/r/earthporn/.json?limit=100" );
//Grid.setup( "http://www.reddit.com/r/funnypics/.json?limit=100" );
Grid.setup( "http://www.reddit.com/r/aww/.json?limit=100" );

