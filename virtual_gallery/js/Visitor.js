/**
 * @author Yikai Gong
 */

var xLabs = xLabs || {};
var normal = new THREE.Vector3();
var binormal = new THREE.Vector3();

// Constants
var pitchResetMsec = 3500;
var maxWalkAcc = maxWalkSpeed / 50;
//var maxYawAcc  = 0.01; // not used since the head position can't change instantaneously, ie. the head movement is inherently smooth
var maxPitchAccDeg = 0.02;
var maxPitchDeg =  45;
var minPitchDeg = -45;

xLabs.Visitor = function(){

	// var
    this.startMov = false;
    this.container = null;
    this.camera = null;
    this.chaseCamera = null;
    this.cameraTrack;
    this.tube;
    this.scene = null;
    this.renderer = null;
    this.ground = null;
    this.sky = null;
    this.orbitControl = null;
    this.light = null;
    this.xLabsController = null;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.loader = new THREE.OBJMTLLoader();
    this.parent = new THREE.Object3D();
    this.gui;
    this.importObj;
    this.tubeGeometry;
    this.cameraHelper;
    this.modeSelection;
    this.cameraBox;
	this.lastPitchChangeMsec = new Date().getTime();
}

xLabs.Visitor.prototype = {
    init : function(){
        this.container = document.getElementById('container');
        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setSize(this.width,this.height);
        this.container.appendChild(this.renderer.domElement);
        this.scene = new THREE.Scene();
        this.scene.add(this.parent);
//        this.scene.add(this.object);
        THREEx.WindowResize(this.renderer, this.camera);
        this.initGUI();
        this.initXLabsController();
        this.initBasicController();
        this.initCamera();
        this.initGround();
        this.initSky();
        this.initLight();
        this.loadObject('assets/models/HosierLane/xLabs model.obj', 'assets/models/HosierLane/xLabs model.mtl'); //'assets/models/HosierLane/xLabs model.mtl'
//        this.loadObject('assets/models/HosierLane/xLabs model.obj', null);
        this.initTrack();
		
		keyBoardControler.chase = true;
    },
    start : function(){
        var self = this;
        function animation(){
            requestAnimationFrame(animation);
            if(self.startMov) {
                self.update();
            }
//            console.log(self.tubeGeometry);
//            self.cameraHelper.update();
//            self.renderer.render(self.scene, keyBoardControler.chase ? self.chaseCamera : self.camera);
//            self.renderer.render(self.scene, self.chaseCamera);
        }

        animation();
    },
    initCamera : function(){
        this.camera = new THREE.PerspectiveCamera(50, this.width/this.height, 0.1, 30000);
        this.chaseCamera = new THREE.PerspectiveCamera(50, this.width/this.height, 0.1, 30000);
        this.cameraBox = new THREE.Object3D();
//        this.cameraBox.applyMatrix(new THREE.Matrix4().makeRotationY(0));
        this.cameraBox.add(this.chaseCamera);
        this.parent.add(this.cameraBox);
        this.chaseCamera.lookAt(new THREE.Vector3(-1,0,0));
        this.cameraHelper = new THREE.CameraHelper(this.chaseCamera);
        this.cameraHelper.visible = false;
        this.addObject(this.cameraHelper);
//        console.log(this.scene);
        this.camera.position.set(15,15,15);
        this.camera.lookAt(new THREE.Vector3(0,5,0));
//        this.camera.setViewOffset(this.width,this.height, this.width/4 , this.height/4, this.width/2, this.height/2);

        this.orbitControl = new THREE.OrbitControls( this.camera, this.renderer.domElement );
        this.orbitControl.userPan = false;
        this.orbitControl.userPanSpeed = 0.0;
        this.orbitControl.minDistance = 0.1;
        this.orbitControl.maxDistance = Infinity;
        this.orbitControl.target = new THREE.Vector3(0,0,0);
    },
    initLight : function(){
        this.light = new THREE.SpotLight(0xffffff);
        this.light.position.set(0,10000,0);
        this.scene.add(this.light);
        var directionalLight;
        directionalLight = new THREE.DirectionalLight( 0xffffff, 0.4 );
        directionalLight.position.set( -1000, 500, - 1000 );
        this.scene.add( directionalLight );
        directionalLight = new THREE.DirectionalLight( 0xffffff, 0.4 );
        directionalLight.position.set( - 1000, 500, 1000 );
        this.scene.add( directionalLight );
        directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
        directionalLight.position.set( 1000, 500, -1000 );
        this.scene.add( directionalLight );
        directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
        directionalLight.position.set( 1000, 500, 1000 );
        this.scene.add( directionalLight );
    },
    initGround : function(){
//        var floorTexture = new THREE.ImageUtils.loadTexture( 'assets/image/checkerboard.jpg' );
        var floorTexture = new THREE.ImageUtils.loadTexture( 'assets/image/Pavement-texture_small.jpg' );
        floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set( 100, 100 );
        // DoubleSide: render texture on both sides of mesh
        var floorMaterial = new THREE.MeshBasicMaterial( { map: floorTexture, side: THREE.DoubleSide } );
        var floorGeometry = new THREE.PlaneGeometry(10000, 10000, 1, 1);
        this.ground = new THREE.Mesh(floorGeometry, floorMaterial);
        this.ground.scale.set(0.01,0.01,0.01 );
        this.ground.rotation.x = Math.PI / 2;
        this.ground.position.set(0, -0.5, 0);
        this.scene.add(this.ground);
    },
    initSky : function(){
        var d = new THREE.Texture([]);
        d.format = THREE.RGBFormat;
        d.flipY = false;
        var loader = new THREE.ImageLoader();
        var getSide;
        loader.load('assets/image/skyboxsun25degtest.png', function (image) {
            getSide = function ( x, y ){
                var size = 1024;
                var canvas = document.createElement( 'canvas' );
                canvas.width = size;
                canvas.height = size;
                var context = canvas.getContext( '2d' );
                context.drawImage( image, - x * size, - y * size );
                return canvas;
            };
            d.image[ 0 ] = getSide( 2, 1 ); // px
            d.image[ 1 ] = getSide( 0, 1 ); // nx
            d.image[ 2 ] = getSide( 1, 0 ); // py
            d.image[ 3 ] = getSide( 1, 2 ); // ny
            d.image[ 4 ] = getSide( 1, 1 ); // pz
            d.image[ 5 ] = getSide( 3, 1 ); // nz
            d.needsUpdate = true;
        });
        var cubeShader = THREE.ShaderLib['cube'];
        cubeShader.uniforms['tCube'].value = d;
        var skyBoxMaterial = new THREE.ShaderMaterial( {
            fragmentShader: cubeShader.fragmentShader,
            vertexShader: cubeShader.vertexShader,
            uniforms: cubeShader.uniforms,
            depthWrite: false,
            side: THREE.BackSide
        });
        this.sky = new THREE.Mesh(new THREE.BoxGeometry( 10000, 10000, 10000 ),skyBoxMaterial);
        this.scene.add(this.sky);
    },
    initXLabsController : function(){
        this.xLabsController = new xLabs.webCamController();
    },
    loadObject : function(obj_path, mtll_path){
        var self = this;
        this.loader = new THREE.OBJMTLLoader();
        this.loader.load(obj_path, mtll_path, function(object){
            object.rotation.x = degInRad(-1);
            self.addObject(object);
            self.startMov = true;
            // Hide the loading screen
            document.getElementById("loading").style.display = 'none';
            // Show main display
            document.getElementById("container").style.display = 'block';
        });
    },
    initTrack : function(){
        this.cameraTrack = new THREE.ClosedSplineCurve3([
            new THREE.Vector3(-1.65,0.78,0.28),
            new THREE.Vector3(-14.67,0.78,0.28),new THREE.Vector3(-19.22,0.78,-4.04),
            new THREE.Vector3(-20.00,0.78,-30.39),new THREE.Vector3(-16.60,0.78,-35.37),
            new THREE.Vector3(-2.16,0.78,-35.37),new THREE.Vector3(1.65,0.78,-30.43),
            new THREE.Vector3(1.32,0.78,-4.54)]);
        this.tubeGeometry = new THREE.TubeGeometry(this.cameraTrack, 50, 1, 2, true);
        this.tubeMaterial = new THREE.MeshBasicMaterial({color:0xFF3300,wireframe:true});
        this.tubeMaterial.visible=false;
        this.tube = new THREE.Mesh(this.tubeGeometry, this.tubeMaterial);
        this.addObject(this.tube);
//        this.startMov = true;
    },
    initBasicController : function () {
        window.addEventListener('keyup', function(event) { onKeyUp(event); }, false);
        window.addEventListener('keydown', function(event) { onKeyDown(event); }, false);
        window.addEventListener('keypress', function(event) { onKeyPress(event); });
    },
    update : function(){
        var self = this;
		
        t += walkSpeed;
        if(t>1) t -= 1;
        if(t<0) t += 1;
        var pos = this.tubeGeometry.parameters.path.getPointAt(t);
        pos.y += 1.1;
		
		// Bobbing
		var dy = Math.sin( 2 * Math.PI * t * 120 ) * 0.007;
		var dx = Math.sin( 2 * Math.PI * t * 120 ) * 0.01;
		pos.y += dy;
		pos.x += dx;
		
        this.cameraBox.position.copy(pos);
//        var d = radToDeg(lastCamDir.angleTo(movDirection));

        x = (new THREE.Vector3(-1,0,0)).angleTo(movDirection);
        if(this.modeSelection.autoRotation){
            var th0 = Math.atan2( lastMovDir.x, lastMovDir.z );
            var th1 = Math.atan2( movDirection.x, movDirection.z );
            var dth = th1-th0;
            if( dth >  Math.PI ) dth -= 2*Math.PI;
            if( dth <= Math.PI ) dth += 2*Math.PI;
            customRotation += radToDeg(dth);
//            customRotation -= radToDeg(lastMovDir.angleTo(movDirection));
//            this.cameraBox.lookAt(this.cameraBox.position.add(new THREE.Vector3(1,0,0)));
//            console.log(this.cameraBox.position.add(new THREE.Vector3(1,0,0)));
//            var diff = new THREE.Vector3(-1,0,0).angleTo(movDirection);
//            var v1 = new THREE.Vector3(-1,0,0);
//            var v2 = new THREE.Vector3(0,0,-1)
//            console.log((new THREE.Vector3(1,0,0)).angleTo(new THREE.Vector3(1,-1,0)));
//            console.log(Math.atan2(v1.x, v1.z));
//            console.log(Math.atan2(v2.x, v2.z));
            this.cameraBox.rotation.y=degInRad(customRotation);


//            this.chaseCamera.rotation.z = degInRad(customRotationUp);

            this.chaseCamera.lookAt(new THREE.Vector3(-1,0,0).applyEuler(new THREE.Euler(0,0,-degInRad(customRotationUp))));

//            this.chaseCamera.lookAt(pos.add((new THREE.Vector3(-1,0,0)).applyEuler(new THREE.Euler(0,degInRad(customRotation),-degInRad(customRotationUp)))));
//            this.chaseCamera.lookAt(pos.add(movDirection.applyEuler(new THREE.Euler(0,degInRad(customRotation),-degInRad(customRotationUp)))));
        }
        else{
            this.cameraBox.rotation.y=degInRad(customRotation);
            this.chaseCamera.lookAt(new THREE.Vector3(-1,0,0).applyEuler(new THREE.Euler(0,0,-degInRad(customRotationUp))));
        }
//            this.chaseCamera.lookAt(pos.add((new THREE.Vector3(-1,0,0)).applyEuler(new THREE.Euler(0,degInRad(customRotation),-degInRad(customRotationUp)))));
//        console.log(radToDeg(x));
        //control part
        if(keyBoardControler.left){
            customRotation += 1;
        }
        if(keyBoardControler.right){
            customRotation -= 1;
        }
        if(keyBoardControler.up)
            customRotationUp += 1;
        if(keyBoardControler.down)
            customRotationUp -= 1;
        this.xLabsController.update(function(targetYawRate, targetPitchRate, targetWalkSpeed){ //???
			
			if( targetWalkSpeed > maxWalkSpeed )  targetWalkSpeed = maxWalkSpeed;
			
			// Stop moving when facing the wall
			var cameraAngle = movDirection.angleTo(camDirection);		
			var cameraAngleDeg = cameraAngle*180/Math.PI;
			var ratio = Math.cos(cameraAngle);
			var zeroRange = 30;
			if( cameraAngleDeg >  zeroRange && cameraAngleDeg <  90 + zeroRange ) ratio = 0;
			if( cameraAngleDeg < -zeroRange && cameraAngleDeg > -90 - zeroRange ) ratio = 0;	
			
			walkSpeed = smoothAcc( walkSpeed, targetWalkSpeed * ratio, maxWalkAcc );

			//yawRate = smoothAcc( yawRate, targetW, maxYawAcc );
			yawRate = targetYawRate;
            customRotation += yawRate;
			
			if( self.modeSelection.pitch ) {
				pitchRate = smoothAcc( pitchRate, targetPitchRate, maxPitchAccDeg );
				customRotationUp += pitchRate;
				if( customRotationUp > maxPitchDeg ) customRotationUp = maxPitchDeg;
				if( customRotationUp < minPitchDeg ) customRotationUp = minPitchDeg;
			}
			
			var nowMsec = new Date().getTime();
			if( targetPitchRate != 0 ) {
				xLabs.Visitor.lastPitchChangeMsec = nowMsec;
			}
			
//			console.log( nowMsec );
//			console.log( xLabs.Visitor.lastPitchChangeMsec );
//			console.log( pitchResetMsec );
			if( nowMsec - xLabs.Visitor.lastPitchChangeMsec > pitchResetMsec ) {
				var step = 0.1;
                if( customRotationUp >  step ) customRotationUp -= step;
                if( customRotationUp < -step ) customRotationUp += step;
			}

        });
        lastMovDir = movDirection;
        movDirection = this.tubeGeometry.parameters.path.getTangentAt(t);
        camDirection = new THREE.Vector3(-1,0,0).applyEuler(this.cameraBox.rotation);
        this.cameraHelper.update();
        this.renderer.render(self.scene, keyBoardControler.chase ? self.chaseCamera : self.camera);
    },
    addObject : function(object){
        this.scene.add(object);
    },
    initGUI : function (){
        this.gui = new dat.GUI();
        this.modeSelection =
        {
            a: function() {xLabs.mode=xLabs.webCamController.CONTROL_MODE_ROLL;},
            b: function() {xLabs.mode=xLabs.webCamController.CONTROL_MODE_YAW;},
            c: function() {xLabs.mode=xLabs.webCamController.CONTROL_MODE_X;},
            pitch: false,
            autoRotation: false
        };
        this.gui.add( this.modeSelection, 'a' ).name('Roll Mode (D)');
        this.gui.add( this.modeSelection, 'b' ).name('Yaw Mode');
        this.gui.add( this.modeSelection, 'c' ).name('Position Mode');
        this.gui.add( this.modeSelection, 'pitch' ).name('Enable Pitch');
        this.gui.add( this.modeSelection, 'autoRotation' ).name('Camera Auto');
        this.gui.close();
    }
}

var movDirection = new THREE.Vector3(-1,0,0);
var camDirection = new THREE.Vector3(-11,0,0);
var lastMovDir = new THREE.Vector3(-1,0,0);
var customRotation = 0, customRotationUp = 0, customRotation2 = 0;
var t = 0.0;
var walkSpeed = 0;
var yawRate = 0;
var pitchRate = 0;
var x=0;