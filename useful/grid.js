
///////////////////////////////////////////////////////////////////////////////
// Interactive calibration mode: You play a game to get some detailed 
// calibration data.
///////////////////////////////////////////////////////////////////////////////
var Grid = {

  url : null,
  width : 4,
  height : 3,
  
  selectedTile : null,

  getNbrTiles : function() {
    return Grid.width * Grid.height;
  },

  selectTileNearest : function( xScreen, yScreen ) {
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

    var id = Grid.getTileDivId( xMin, yMin );
    Grid.selectTile( id );
  },

  getTileOrigin : function() {
    var bevel = window.innerHeight * 0.1;
    var tileOrigin = { x: bevel, y: bevel };
    return tileOrigin;
  },

  getTileSize : function() {
    var bevel = window.innerHeight * 0.1;
    var tilesHeight = window.innerHeight - ( bevel * 2 );
    var tileHeight = tilesHeight / Grid.height;
    var tilesWidth = window.innerWidth - ( bevel * 2 );
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

    if( Grid.selectedTile != null ) {
      if( Grid.selectedTile == did ) {
        Grid.deselectTile();
        return;
      }
    }

    Grid.selectTile( did );//x, y );
  },

  getTileCoord : function( id ) {
    var i1 = id.indexOf( ':' )+1;
    var i2 = id.indexOf( ',' )+1;
    var i3 = id.length
    var l1 = i2 - i1 -1;
    var l2 = i3 - i2 +1;
    var x = id.substr( i1, l1 );
    var y = id.substr( i2, l2 );
    var c = { x: x, y: y };
    return c;
  },

  getTileRect : function( x, y ) {
    var tileOrigin = Grid.getTileOrigin();
    var tileSize = Grid.getTileSize();
    var top = tileOrigin.y + y * tileSize.h;
    var left = tileOrigin.x + x * tileSize.w;
    var z = 10;
    var r = { x: left, y: top, w: tileSize.w, h: tileSize.h, z:z };
    return r;
  },

  getTileDivId : function( x, y ) {
    var did = "div:" + x + "," + y;
    return did;
  },

  deselectTile : function() {
    if( Grid.selectedTile == null ) {
      return;
    }

    var id = Grid.selectedTile;
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
    Grid.selectedTile = null;
  },

  selectTile : function( id ) {
    Grid.deselectTile();
    Grid.selectedTile = id;

    var imgDiv = document.getElementById( Grid.selectedTile );
    
    var f = 1.2;    
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
        content = content + "<div class='tile' style='position: absolute; zIndex:10; top: "+r.y+"px; left: "+r.x+"px; width: "+r.w+"px; height: "+r.h+"px;' id='"+did+"' ><img id='"+iid+"' src='"+imgUrl+"' style='align:center; valign:center;max-width:100%; max-height:100%;' /></div>";
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

  setup : function( url ) {
    Grid.url = url;
    Grid.getData();
  }

};

//Grid.setup( "http://www.reddit.com/r/earthporn/.json?limit=100" );
Grid.setup( "http://www.reddit.com/r/funnypics/.json?limit=100" );

