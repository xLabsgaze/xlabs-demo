
// Loading resources, from: http://jlongster.com/Making-Sprite-based-Games-with-Canvas
(function() {
    var resourceCache = {};
    var loading = [];
    var readyCallbacks = [];

    // Load an image url or an array of image urls
    function load(urlOrArr) {
        if(urlOrArr instanceof Array) {
            urlOrArr.forEach(function(url) {
                _load(url);
            });
        }
        else {
            _load(urlOrArr);
        }
    }

    function _load(url) {
        if(resourceCache[url]) {
            return resourceCache[url];
        }
        else {
            var img = new Image();
            img.onload = function() {
                resourceCache[url] = img;

                if(isReady()) {
                    readyCallbacks.forEach(function(func) { func(); });
                }
            };
            resourceCache[url] = false;
            img.src = url;
        }
    }

    function get(url) {
        return resourceCache[url];
    }

    function getAll() {
        return resourceCache;
    }


    function isReady() {
        var ready = true;
        for(var k in resourceCache) {
            if(resourceCache.hasOwnProperty(k) &&
               !resourceCache[k]) {
                ready = false;
            }
        }
        return ready;
    }

    function onReady(func) {
        readyCallbacks.push(func);
    }

    window.resources = { 
        load: load,
        get: get,
        onReady: onReady,
        isReady: isReady,
        getAll: getAll
    };
})();


XLabsAnts = function() {

    this.antSize = 50;
    this.clickCatchment = 70;
    this.gazeCatchment = 100;
    this.boxH = Math.min( window.innerWidth, window.innerHeight );
    this.boxW = Math.min( window.innerWidth, this.boxH * 1.2 );

    // this.canvas = null;
    // this.ctx = null;
    this.ants = [];
    this.lastUpdate = null;
    this.lastAddAnt = null;
    this.addAntInterval = 1000;

    this.squishStateTime = 1000;


    // this.validGaze = false;
    // this.gazeX = null;
    // this.gazeY = null;
}

// XLabsAnts.prototype.addFullScreenCanvas = function(canvasId, zIndex) {
    // // canvas element (usually invisible graphical overlay)
    // this.canvas = document.createElement( 'canvas' );
    // this.canvas.id = canvasId;
    // this.canvas.width = window.innerWidth;
    // this.canvas.height = window.innerHeight;
    // this.canvas.style.background = "0"
    // this.ctx = this.canvas.getContext( "2d" );

    // // add these UI tools to the document:    
    // var style = document.createElement( 'style' ); // style - positions the canvas element and makes it 'click throughable' 
    // if(typeof zIndex === 'undefined') {
    //     var zIndex = "";
    // }
    // else {
    //     zIndex = "z-index:" + zIndex;
    // }
    // var styleString = '';
    // styleString += 'html,body{padding:0;margin:0;}';
    // styleString += '#'+canvasId+'{pointer-events:none;top:0;left:0;position:fixed;'+zIndex+'}';
    // // canvasStyleString += '#'+canvasIx+'.allow-pointer{pointer-events:auto;}';
    // var rules = document.createTextNode(styleString);
    // style.type = 'text/css';

    // if( style.styleSheet ) {
    //   style.styleSheet.cssText = rules.nodeValue;
    // }
    // else {zIndex
    //   style.appendChild( rules );
    // }

    // var head = document.getElementsByTagName( 'head' )[0];
    // head.appendChild( style );
    // document.getElementsByTagName('body')[ 0 ].appendChild( this.canvas );
// }

XLabsAnts.prototype.addRandomAnt = function() {
    this.addAnt(
        Math.random() * this.boxW + (window.innerWidth-this.boxW)/2,
        Math.random() * this.boxH + (window.innerHeight-this.boxH)/2,
        (Math.random()-0.5) * 0.3,
        (Math.random()-0.5) * 0.3 );
}

XLabsAnts.prototype.init = function( onReady ) {
    resources.load([
        './img/ant_100x100.png',
        './img/ant_100x100_squish.png'
    ]);

    Gaze.xyLearningRate = 0.8;

    // this.addFullScreenCanvas("antsCanvas");
    Canvas.add();
    Canvas.show();

    var self = this;
    
    // for( i = 0; i < 100; i++ ) {
    //     addRandom();
    // }

    resources.onReady( onReady );
}


XLabsAnts.prototype.mainLoop = function() {
    var self = this;
    this.update();
    this.render();
    window.requestAnimationFrame( function() { self.mainLoop(); });
}


XLabsAnts.prototype.addAnt = function( x, y, vx, vy ) {
    var ant = new XLabsAnts.ant();
    ant.x = x;
    ant.y = y;
    ant.vx = vx;
    ant.vy = vy;

    console.log( ant.x )
    console.log( ant.y )
    console.log( ant.vx )
    console.log( ant.vy )

    // ant.imgElement = resources.get("./img/ant_100x100.png").cloneNode();
    // ant.imgElement.style.position = "absolute";
    // ant.imgElement.style.left = "300px";
    // ant.imgElement.style.top = "300px";
    // var body = document.getElementsByTagName( 'body' )[0];
    // body.appendChild( ant.imgElement );

    this.ants.push(ant);
}

XLabsAnts.prototype.update = function() {
    var self = this;
    var now = Date.now();
    
    if( this.lastUpdate === null ) {
        this.lastUpdate = Date.now();
    }

    var interval = now - this.lastUpdate;
    this.lastUpdate = now;

    this.ants.forEach(function(ant){
        ant.update( self, interval ); 
    });

    // Remove dead ants
    this.ants.forEach( function(ant, idx) {
        if( ant.state === ANT_STATE_REMOVE ) {
            self.removeAnt( idx );
        }
    });


    // Add more ants
    if( this.ants.length < 10 ) {
        if( this.lastAddAnt === null ) {
            this.lastAddAnt = Date.now();
        }

        if( now - this.lastAddAnt > this.addAntInterval ) {
            this.addRandomAnt();
            this.lastAddAnt = now;
        }
    }
}

XLabsAnts.prototype.render = function() {
    if( !xLabs.documentOffsetReady() ) {
        return;
    }

    var self = this;

    // this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    Canvas.clear();

    this.ants.forEach(function(ant){
        ant.render( self );
    });

    // var x = Gaze.xMeasuredSmoothed;
    // var y = Gaze.yMeasuredSmoothed;
    var x = Gaze.xSmoothed;
    var y = Gaze.ySmoothed;

    x = xLabs.scr2docX( x );
    y = xLabs.scr2docY( y );

    // gaze feedback
    if( Gaze.available ) {
        // Canvas.context.strokeStyle = "rgba( 255, 128, 0, 0.4 )"
        Canvas.context.strokeStyle = "rgba( 0, 0, 0, 1.0 )"
        Canvas.context.beginPath();
        Canvas.context.arc( x, y, 20, 0, 2 * Math.PI, false );
        Canvas.context.stroke();
    }
}

XLabsAnts.prototype.removeAnt = function( idx ) {
    this.ants.splice(idx, 1);
}


XLabsAnts.prototype.onClick = function( e ) {
    this.squishAt( e.clientX, e.clientY, this.clickCatchment );
}

XLabsAnts.prototype.squishAt = function( x, y, catchment ) {

    var self = this;

    dThresh = catchment*catchment;

    function perAnt(ant, idx) {
        var dx = x - ant.x;
        var dy = y - ant.y;
        // console.log( x )

        if( dx*dx + dy*dy < dThresh ) {
            ant.state = ANT_STATE_SQUISHED;
            ant.stateStartTime = Date.now();
        }
    }

    this.ants.forEach( perAnt );
}

XLabsAnts.prototype.updateGaze = function() {    
    Gaze.update();
    // this.gazeX = parseInt( xLabs.getConfig( 'state.gaze.measured.x' ) );
    // this.gazeY = parseInt( xLabs.getConfig( 'state.gaze.measured.y' ) );

    if( !xLabs.documentOffsetReady() ) {
        return;
    }

    var x = xLabs.scr2docX( Gaze.xSmoothed );
    var y = xLabs.scr2docY( Gaze.ySmoothed );

    this.squishAt( x, y, this.gazeCatchment );
}


// -------------------------------------------------------------------------
// -------------------------------------------------------------------------
// -------------------------------------------------------------------------
// -------------------------------------------------------------------------
// -------------------------------------------------------------------------
// -------------------------------------------------------------------------

var ANT_STATE_MOVING = "moving";
var ANT_STATE_SQUISHED = "squished";
var ANT_STATE_REMOVE = "remove";


XLabsAnts.ant = function() {
    this.x = null; // pixels
    this.y = null; // pixels
    this.vx = null; // pixels per msec
    this.vy = null; // pixels per msec
    this.state = ANT_STATE_MOVING;
    this.stateStartTime = Date.now();
}

XLabsAnts.ant.prototype.update = function( xLabsAnts, interval ) {
    var now = Date.now();

    // State transitions
    if( this.state === ANT_STATE_SQUISHED ) {
        if( now - this.stateStartTime > xLabsAnts.squishStateTime ) {
            this.state = ANT_STATE_REMOVE;
        }
    }
    else if( this.state === ANT_STATE_MOVING ) {
        var vx = interval * this.vx;
        var vy = interval * this.vy;

        this.x += vx;
        this.y += vy;

        var s = xLabsAnts.antSize;
        var left   = Canvas.element.width /2 - xLabsAnts.boxW/2 + s/2;
        var right  = Canvas.element.width /2 + xLabsAnts.boxW/2 - s/2;
        var top    = Canvas.element.height/2 - xLabsAnts.boxH/2 + s/2;
        var bottom = Canvas.element.height/2 + xLabsAnts.boxH/2 - s/2;

        if(    ( this.vx < 0 && this.x <= left )
            || ( this.vx > 0 && this.x >= right ) ) {
            this.vx = this.vx * -1;
        }
        if(    ( this.vy < 0 && this.y <= top )
            || ( this.vy > 0 && this.y >= bottom ) ) {
            this.vy = this.vy * -1;
        }
        // console.log( this.x );
        // console.log( this.y );
    }
}

XLabsAnts.ant.prototype.render = function( xLabsAnts ) {

    var rad = Math.atan2( this.vy, this.vx );
    var s = xLabsAnts.antSize;

    if( this.state !== ANT_STATE_REMOVE ) {
        Canvas.context.save();
        Canvas.context.translate( this.x, this.y );
        Canvas.context.rotate( rad );

        if( this.state === ANT_STATE_MOVING ) {
            var img = resources.get("./img/ant_100x100.png");
        }
        else if( this.state === ANT_STATE_SQUISHED ) {
            var img = resources.get("./img/ant_100x100_squish.png");
        }

        Canvas.context.drawImage( img,
            0, 0, img.width, img.height, // src clip
            -s/2, -s/2, s, s); // dst size

        Canvas.context.restore();
    }

}



// -------------------------------------------------------------------------
// -------------------------------------------------------------------------
// -------------------------------------------------------------------------
// -------------------------------------------------------------------------
// -------------------------------------------------------------------------
// -------------------------------------------------------------------------

window.addEventListener( "beforeunload", function() {
    xLabs.setConfig( "system.mode", "off" );
});

window.myAnts = null;

function onXlabsReady() {
    xLabs.setConfig( "system.mode", "learning" );
    xLabs.setConfig( "browser.canvas.paintLearning", "0" );

    window.myAnts = new XLabsAnts();
    window.myAnts.init( function() {
        document.addEventListener( "click", function(e) { window.myAnts.onClick(e); } );
        window.myAnts.mainLoop();
    });
}

xLabs.setup( onXlabsReady, function() { window.myAnts.updateGaze(); } );









