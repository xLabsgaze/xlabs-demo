/**
 * @author Yikai Gong
 */

function initGUI(){
    var self = this;
    this.gui = new dat.GUI();
    this.importObj = document.createElement("input");
    this.importObj.type = 'file';
    this.importObj.multiple={};
    this.importObj.addEventListener("change", onFileChange);
    var parameters =
    {
        a: function() {self.importObj.click();},
        b: function() {}
    };
    // gui.add( parameters )
    this.gui.add( parameters, 'a' ).name('Import');
    this.gui.add( parameters, 'b' ).name('Clear');
//    this.gui.open();
    this.gui.close();
}

var materialCreator;
var object;
function onFileChange(event){
    var fileReader;
    var objFile;
    var mtlFile;
    for(var i = 0; i < visitor.importObj.files.length ; i++){
        var filename = visitor.importObj.files[i].name
        var extension = filename.split( '.' ).pop().toLowerCase();
        if(extension === "obj"){
            objFile = visitor.importObj.files[i];
        }
        else if(extension === "mtl"){
            mtlFile = visitor.importObj.files[i];
        }
    }
    if(!objFile){
        alert("no .obj file specified");
        return;
    }
    if(mtlFile){
        readMTL(mtlFile);
    }
    else{
        readOBJ(objFile);
    }

    function readMTL (mtlFile) {
        var fileReader = new FileReader();
        fileReader.onload = function(event){
            var contents = event.target.result;
            var option = {};
            option.side = THREE.DoubleSide;
            materialCreator = new THREE.MTLLoader("/assets/models/HosierLane/", option).parse(contents);
            readOBJ(objFile, materialCreator);
        }
        fileReader.readAsText(mtlFile);
    }

    function readOBJ (objectFile, materialCreator){
        var fileReader = new FileReader();
        fileReader.onload = function(event){
            var contents = event.target.result;
            var object = new THREE.OBJLoader().parse(contents);
            if(materialCreator){
                materialCreator.preload();
                object.traverse(function(child){
                    if(child instanceof THREE.Mesh){
                        if(child.material.name){
                            var material = materialCreator.create(child.material.name);
                            if(material) child.material = material;
                        }
                    }
                });
            }
            object.position.set(0,2,0);
            visitor.scene.add(object);
        }
        fileReader.readAsText(objectFile);
    }
    console.log(objFile);
    console.log(mtlFile);
}

//function smoother(currentValue, targetValue, alpha ){
//    var output;
//    var beta = 1.0 - alpha;
//    output = targetValue * beta + currentValue * alpha === undefined ? 0 : targetValue * beta + currentValue * alpha;
//    return output;
//}