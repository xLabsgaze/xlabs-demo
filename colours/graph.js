
  // Thanks to & derived from:
  // http://jsdatav.is/visuals.html?id=49b1d119e05b5efbf96e
  // https://nyquist212.wordpress.com/2014/03/11/simple-d3-js-force-layout-example-in-less-than-100-lines-of-code/
  // http://stackoverflow.com/questions/9901565/charge-based-on-size-d3-force-layout

  var params = {
    radius : 108,
    distanceThreshold : 150,
    force : 1080 * 10.0,//25.0,
    friction : 0.8,
    gravity : 0.3,
    fontSize : 40,
    hueSimilarityThreshold : 6
  }

  // Colour conversion functions
  function hex2Rgb( hex ) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
  }

  function rgb2Hsv( rgb ) {
    var r = rgb.r;
    var g = rgb.g;
    var b = rgb.b;
    var rgbArray = [rgb.r,rgb.g,rgb.b];
    var max = Math.max.apply(Math, rgbArray );
    var min = Math.min.apply(Math, rgbArray );
 
    var chr = max-min;
    var hue = 0;
    var val = max;
    var sat = 0;

    if( val > 0 ) {
      sat = chr/val;
      if( sat > 0 ) {
        if( r == max ) { 
          hue = 60*(((g-min)-(b-min))/chr);
          if (hue < 0) {hue += 360;}
        } else if (g == max) { 
          hue = 120+60*(((b-min)-(r-min))/chr); 
        } else if (b == max) { 
          hue = 240+60*(((r-min)-(g-min))/chr); 
        }
      } 
    }

    return { h: hue, s: sat, v: val };
  }

  function similarColour( colour1, colour2 ) {
    var rgb1 = hex2Rgb( colour1 );
    var rgb2 = hex2Rgb( colour2 );
    var hsv1 = rgb2Hsv( rgb1 );
    var hsv2 = rgb2Hsv( rgb2 );

    var d = Math.abs( hsv1.h - hsv2.h );
    if( d < params.hueSimilarityThreshold ) {
      return true;
    }
    return false;
  }

  var Graph = {
 
    id : "svg",
    svg : null,
    forceLayout : null,
    circles : null,
    labels : null,

    // Font scaling functions
    calcFontSize : function( classValue ) {
      if( classValue == "big" ) {
        return params.fontSize;
      }
      if( classValue == "med" ) {
        return Math.floor( params.fontSize * 0.75 );
      }
      return Math.floor( params.fontSize * 0.5 );
    },

    updateForces : function( node ) {
      if( Graph.circles != null ) {
        var element = Graph.circles[0][ node.index ];
        var classValue = element.getAttribute( 'class' );
        if( classValue == 'big' ) {
          return -params.force;
        } 
        else if( classValue == 'med' ) {
          return -params.force * 0.5;
        } 
        else if( classValue == 'tiny' ) {
          return -params.force * 0.25;
        } 
      }
      return -params.force * 0.1;
    },

    getCountCircles : function() {
      var circles = $("#"+Graph.id+" circle" );
      return circles.length;    
    },

    getCountCircleClass : function( countClassValue ) {
      var circles = $("#"+Graph.id+" circle" );
      var count = 0;

      for( var i = 0; i < circles.length; i++ ) {
        var classValue = circles[ i ].getAttribute( 'class' );
        if( classValue == countClassValue ) {
          count = count +1;
        }
      }

      return count;
    },

    hideCircleAt : function( x, y, rScale ) {
      //console.log( "hide @"+x+","+y );
      var circles = $("#"+Graph.id+" circle" );
      var dMin = screen.width * screen.width;
      var iMin = 0;

      for( var i = 0; i < circles.length; i++ ) {
        var cx = parseFloat( circles[ i ].getAttribute( 'cx' ) );
        var cy = parseFloat( circles[ i ].getAttribute( 'cy' ) );
        var r  = parseFloat( circles[ i ].getAttribute( 'r' ) );
        var dx = x - cx;
        var dy = y - cy;
        var d = Math.sqrt( dx * dx + dy * dy );
        var t = ( r * rScale );
        if( d < t ) {
          circles[ i ].setAttribute( 'r', 2 );
          circles[ i ].setAttribute( 'class', "tiny" );
        }
      }
    },

    showCircleRandom : function( p ) {
      var circles = $("#"+Graph.id+" circle" );

      var near = [];

      for( var i = 0; i < circles.length; i++ ) {
        var classValue = circles[ i ].getAttribute( 'class' );
        if( classValue == "tiny" ) {
          near.push( i );
        }
      }

      if( near.length < 1 ) {
        return;
      }

      if( Math.random() > p ) {
        return;
      }

      var iRandom = Graph.getRandomInteger( 0, near.length -1 );

      var c = near[ iRandom ];
      //console.log( "inflate: "+iRandom+" c="+c );
      circles[ c ].setAttribute( 'class', "small" );
    },

    getRandomInteger : function( intMin, intMax ) {
      var intRandom = ( Math.floor( Math.random() * ( intMax - intMin +1 ) ) + intMin );
      return intRandom;
    },

    updateSelection : function( x, y ) {
      var circles = $("#"+Graph.id+" circle" );
      var dMin = screen.width * screen.width;
      var iMin = 0;

      var near = [];

      for( var i = 0; i < circles.length; i++ ) {
        var cx = parseFloat( circles[ i ].getAttribute( 'cx' ) );
        var cy = parseFloat( circles[ i ].getAttribute( 'cy' ) );
        var dx = x - cx;
        var dy = y - cy;
        var d = Math.sqrt( dx * dx + dy * dy );
        if( d < dMin ) {
          dMin = d;
          iMin = i;
        }
        if( d < params.distanceThreshold ) {
          near.push( i );
        }
      }

      Graph.update( iMin, near );
    },

    updateWithoutSelection : function() {
      Graph.update( -1, [] );
    },

    update : function( selectedCircleIndex, nearbyCircleIndices ) {
      var small = params.radius * 0.5;//20;
      var med = params.radius * 0.75;
      var big = params.radius;

      var circles = $("#"+Graph.id+" circle" );

      for( var i = 0; i < circles.length; i++ ) {

        var classValue = circles[ i ].getAttribute( 'class' );
        if( classValue == "tiny" ) {
          continue;
        }

        var radius = small;
        var classValue = "small";
        if( i == selectedCircleIndex ) {
          radius = big;
          classValue = "big";
        }
        else {
          for( var j = 0; j < nearbyCircleIndices.length; j++ ) {
            if( i == nearbyCircleIndices[ j ] ) {
              radius = med;
              classValue = "med";
            }
          }
        }

        var fontSize = Graph.calcFontSize( classValue );
        circles[ i ].setAttribute( 'r', radius );
        circles[ i ].setAttribute( 'class', classValue );
        var t = Graph.labels[0][ i ];
        t.style[ "font-size" ] = fontSize+"px";
      }

      Graph.forceLayout.start(); // restart the force due to new constraints
    },

    hide : function() {
      document.getElementById( Graph.id ).style.display = "none";
    },
    show : function() {
      document.getElementById( Graph.id ).style.display = "block";
    },

    // Define the main worker or execution function 
    create : function( error, nodes, table ) {

      // build links based on colour similarity
      var links = [];
      for( var i = 0; i < nodes.length; i++ ) {
        var c1 = nodes[ i ].value;
        for( var j = 0; j < nodes.length; j++ ) {
          if( i == j ) continue;
          var c2 = nodes[ j ].value;
          if( !similarColour( c1, c2 ) ) {
            continue;
          }
  
          var link = { "source": i, "target": j };
          links.push( link );
        }
      }

      // Establish the dynamic force behavor of the nodes 
      Graph.forceLayout = d3.layout.force()
                      .nodes(nodes)
                      .links(links)
                      .size([screen.width,screen.height])  
                      .linkDistance( [ params.radius * 2 ] )
                      .charge( Graph.updateForces )
                      .gravity( params.gravity )
                      .friction( params.friction )
                      .start();

      // Draw the edges/links between the nodes that are conceptually similar
      var edges = Graph.svg.selectAll( "line" )
                      .data(links)
                      .enter()
                      .append("line")
                      .style("stroke", "#ccc")
                      .style("stroke-width", 1)
                      .attr("marker-end", "url(#end)");
  
      // Draw the nodes themselves
      var circles = Graph.svg.selectAll( "circle" )
                      .data( nodes )
                      .enter()
                      .append( "circle" )
                      .attr( "r", params.radius )
                      .style( "fill", function( d, i ) { 
                        return d.value; 
                      })
                      .call( Graph.forceLayout.drag );
  
      Graph.circles = circles;

      // Draw the node labels first 
      var texts = Graph.svg.selectAll("text")
                     .data(nodes)
                     .enter()
                     .append( "text" )
                     .attr( "fill", "black" )
                     .attr( "font-family", "sans-serif" )
                     .attr( "font-size", "10px" )
                     .text(function(d) { return d.name; }); 
  
      Graph.labels = texts;

      // Run the Force effect
      Graph.forceLayout.on( "tick", function() {
        edges.attr("x1", function(d) { return d.source.x; })
             .attr("y1", function(d) { return d.source.y; })
             .attr("x2", function(d) { return d.target.x; })
             .attr("y2", function(d) { return d.target.y; });
        circles.attr("cx", function(d) { return d.x; })
               .attr("cy", function(d) { return d.y; })
        texts.attr("transform", function(d) {  
          return "translate(" + d.x + "," + d.y + ")";
        });
      }); // End tick func
    },

    setup : function( parentId, colours, mouse ) {

      // Establish/instantiate an SVG container object 
      //Graph.svg = d3.select( "body" );
      var parent = d3.select( "#"+parentId );
      //var e2 = d3.select( "#"+parentId );
      Graph.svg = parent
                  .append( "svg" )
                  .attr( "style","position:absolute;left:0;top:0;display:none;margin:auto" ) // centered
                  .attr( "height", screen.height ) 
                  .attr( "width", screen.width )
                  .attr( "id", Graph.id );

      // Pre-Load the json data using the queue library 
      queue()
    //    .defer( d3.json, "colours.json" )
    //    .defer( d3.json, "colours_dark.json" )
        .defer( d3.json, colours )
        .await( Graph.create ); 

      // optionally interact with mouse:
      if( mouse ) {
        $(document).mousemove( function( e ) {
          var svg = document.getElementById( Graph.id );
          var x = e.pageX - svg.getBoundingClientRect().left;
          var y = e.pageY - svg.getBoundingClientRect().top;
          Graph.updateSelection( x, y );
        } );
      }
    }

  };

