var isXlabReady = false;

function onApiReady(){
    isXlabReady=true;
}

document.addEventListener( "xLabsApiReady", function(){onApiReady();});

$(document).ready(function(){
    $(".xlabTest").click(function(){
        if(isXlabReady){
            alert("xLabs is ready");
        }
        else{
            alert("xLabs has not been correctly installed");
        }
    });

    $("#play").click(function(){
        window.location.href = "index.html";
    });
});
