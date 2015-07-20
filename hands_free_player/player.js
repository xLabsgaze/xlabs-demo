
var xLabsPlayer = {


    actionsEnabled : 0,
    videoId : null,
    mouseInsideTop : 0,


    // setup : function() {
    //     console.log("Setup");
    // },

    enableActions : function() {
        xLabsPlayer.actionsEnabled = 1;
    },

    disableActions : function( msec ) {
        xLabsPlayer.actionsEnabled = 0;
        setTimeout(xLabsPlayer.enableActions, msec);
    },

    onApiReady : function() {

        document.getElementById("top").style.display = 'block';
        document.getElementById("top").style.backgroundColor = "rgba(0,0,0,0.5)";

        // Parse out the videoId
        xLabsPlayer.videoId = parseQueryVariable(  window.location.href, 'v' );

        if( xLabsPlayer.videoId ) {
            window.addEventListener( "beforeunload", function() {
                xLabs.setConfig( "system.mode", "off" );
            });

            xLabs.setConfig( "system.mode", "head" );
            xLabs.setConfig( "browser.canvas.paintHeadPose", "0" );

            // 2. This code loads the IFrame Player API code asynchronously.
            var tag = document.createElement('script');

            tag.src = "https://www.youtube.com/iframe_api";
            var firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

            document.getElementById("descr").style.display = 'none';

            document.getElementById( "youtube_addr_txt" ).value = "https://www.youtube.com/watch?v=" + xLabsPlayer.videoId;

            xLabsPlayer.mouseInsideTop = 0;
        }
        else {
            document.getElementById( "youtube_addr_txt" ).value = "https://www.youtube.com/watch?v=5uXIPhxL5XA"
            document.getElementById( "landing" ).style.display = 'block';
        }
  },



  update : function() {
        if( xLabsPlayer.actionsEnabled == 0 ) {
            return;
        }

        Errors.update();

        var roll = xLabs.getConfig( "state.head.roll" );

        var rollDeg = roll * 180/Math.PI;

       // console.log( "roll (deg): " + rollDeg );

        /*
        player.getPlayerState():Number
        Returns the state of the player. Possible values are:
        -1 – unstarted
        0 – ended
        1 – playing
        2 – paused
        3 – buffering
        5 – video cued
        */
        playerButton = document.getElementById("playerButton");
        if( playerButton.style.display == 'block' ) {
            playerButton.style.display = 'none'; 
        }
        var state = player.getPlayerState();
        if( Errors.hasNoFace() ) {
            if( state == 1 ) {
                xLabsPlayer.disableActions( 1500 );
                player.pauseVideo();
                playerButton.style.display = 'block';
                document.getElementById("playerButtonImg").src = './resources/player_pause.png';
            }
        }
        else {

            if( state == 2 || state == -1 ){
                player.playVideo();
                playerButton.style.display = 'none';
            }

            if( rollDeg > 10 && state == 1 ) {
                // Go back a few seconds
                xLabsPlayer.disableActions( 1500 );
                var currTime = player.getCurrentTime();
                player.seekTo( currTime-20, true);
                playerButton.style.display = 'block';
                document.getElementById("playerButtonImg").src = './resources/player_rewind.png';
            }
          if( rollDeg < -10 && state == 1 ) {
                // Go back a few seconds
                xLabsPlayer.disableActions( 1500 );
                var currTime = player.getCurrentTime();
                player.seekTo( currTime+20, true);
                playerButton.style.display = 'block';
                document.getElementById("playerButtonImg").src = './resources/player_forward.png';
            }
        }

    },

    onApiState : function() {
        xLabsPlayer.update();
    }

};

xLabs.setup( xLabsPlayer.onApiReady, xLabsPlayer.onApiState, null, "myToken" );

// window.onload = function() {
//     xLabsPlayer.setup();
// }

document.getElementById("top").onmouseover = function() {
    xLabsPlayer.mouseInsideTop = 1;
    document.getElementById("top").style.opacity = 1.0;
}

document.getElementById("top").onmouseout = function() {
    xLabsPlayer.mouseInsideTop = 0;
}

function hasFocus( id ) {
    return document.activeElement.id == id;
}

function eventLoop() {
    var textHasFocus = hasFocus( "youtube_addr_txt" );

    if( !xLabsPlayer.mouseInsideTop && !textHasFocus && xLabsPlayer.videoId ) {
        opacity = document.getElementById("top").style.opacity;
        step = 0.05;
        if( opacity > 0 ) {
            opacity -= step;
            if( opacity < step ) {
                opacity = 0;
            }
            document.getElementById("top").style.opacity = opacity;
        }
    }
}

setInterval( eventLoop, 100 );



// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
var player;
function onYouTubeIframeAPIReady() {

  var videoId = parseQueryVariable( window.location.href, 'v' );

  player = new YT.Player('player', {
    height: '100%',
    width: '100%',
        frameborder: "0",
    videoId: videoId,
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

// 4. The API will call this function when the video player is ready.

function onPlayerReady(event) {
  player.playVideo();
    xLabsPlayer.actionsEnabled = 1;
}

// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
var done = false;
function onPlayerStateChange(event) {
/*
  if (event.data == YT.PlayerState.PLAYING && !done) {
    setTimeout(stopVideo, 6000);
    done = true;
  }
*/
}


function parseQueryVariable( url, variable ) {

//    alert( url );

  var vars = url.split("?");
    if( vars.length < 2 ) {
        return null;    
    }

  vars = vars[1].split("&");
  for (var i=0;i<vars.length;i++) {
    var pair = vars[i].split("=");
    if (pair[0] == variable) {
      return pair[1];
    }
  } 
  return null;
}

function loadYoutubeVideo() {

//    alert( document.getElementById("youtube_addr_txt").value );

    var id = parseQueryVariable( document.getElementById("youtube_addr_txt").value, 'v' );
    if( !id ) {
        alert( "Address does not contain video id." );
    }
    else {
//        alert( "Video id: " + id );
        window.location.href = window.location.pathname + '?v=' + id;
        window.location.reload;
    }
}












