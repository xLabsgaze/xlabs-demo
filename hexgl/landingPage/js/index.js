var isXlabReady = false;

function onApiReady(){
    isXlabReady=true;
}

document.addEventListener( "xLabsApiReady", function(){onApiReady();});

$(document).ready(function(){
    // $(".xlabTest").click(function(){
    //     if(isXlabReady){
    //         alert("xLabs is ready for using");
    //     }
    //     else{
    //         alert("xLabs has not been correctly installed");
    //     }
    // });

    $("#play").click(function(){
    //     if(isXlabReady){
            window.location.href = "game.html";
    //     }
    //     else{
    //         alert("xLabs has not been correctly installed");
    //     }
    });
});