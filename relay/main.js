
function showConfig( json ) {
    var html = Util.json2html( json )
    console.log(html)
    // $("#config")[0].innerHTML = html
}

function handleServerResponse(responseText) {
    var json = JSON.parse(responseText);
    document.getElementById('server-reply').innerHTML = Util.json2html(json)
    if( json.path ) {
        console.log("config command: " + JSON.stringify(json))
        xLabs.setConfig( json.path, json.value )

        setTimeout( function() {
            console.log("Turning off visualisation")
            xLabs.setConfig( "browser.canvas.paintHeadPose", "0" );
        }, 5000);
    }
}


function poll() {
    console.log( "on state" )
    // showConfig( xLabs.config )

    // Send the xlabs states.
    var xmlhttp = new XMLHttpRequest();   // new HttpRequest instance 
    xmlhttp.open("POST", "http://localhost:8000");
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlhttp.onreadystatechange = function() {
        if(xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            handleServerResponse(xmlhttp.responseText);
        }
    }    
    xmlhttp.send(JSON.stringify(xLabs.config));

    // Progress indicator
    document.getElementById('post-time').innerHTML = Date.now()
}

function onXlabsReady( config ) {
    console.log( "xlabs ready" )
    $("#status")[0].innerHTML = "Ready"
}


xLabs.setup( onXlabsReady, null, null, "myToken" )
setInterval( poll, 50 )
