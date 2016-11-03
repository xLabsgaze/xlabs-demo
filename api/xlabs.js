
(function () {
    var EXTENSION_LIST_ATTR = 'data-xlabs-extension-list';

    // function inIframe() {
    //     try {
    //         return window.self !== window.top;
    //     } catch (e) {
    //         return true;
    //     }
    // }

    function XLabsApiImpl() {
        var TYPE_STATE = 'state';
        var TYPE_ID_PATH = 'id-path';
        var TYPE_CS_READY = 'cs-ready';
        var TYPE_IF_CS_READY = 'if-cs-ready';
        var TYPE_CONFIG = 'config';
        var TYPE_REQUEST_ACCESS = 'request-access';


        ///////////////////////////////////////////////////////////////////////////////////////////////////
        // Core API
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        function XLabsApi(options) {
            var _this = this;
            _this._extensionInfo = null;
            _this._config = null;
            _this._callbackReady = null;
            _this._callbackState = null;
            _this._callbackIdPath = null;
            _this._requestAccessIdx = 0;
            _this._developerToken = null;
            _this._csPort = null;
            _this._t1 = 0;

            if (!options.iframe && !XLabsApi.extensionInstalled(options.extensionId)) {
                throw new XLabsApi.NoExtensionError('The extension with id: ' + options.extensionId +
                    ' is not installed or version is < ' + XLabsApi.supportedVersion() );
            }


            _this.init(options);

            setInterval(function () {
                console.log('WindowConnection.connectionEventCnt', WindowConnection.connectionEventCnt);
                console.log('WindowConnection.portEventCnt', WindowConnection.portEventCnt);
            }, 3000);
        };

        // XLabsApi.isExtensionSupported = function (extensionId) {
        //     var list = XLabsApi.getExtensionList();
        //     for (var i = 0; i < list.length; ++i) {
        //         if (utils.compareVersions(list[i].version, XLabsApi.supportedVersion()) >= 0) {
        //             return list[i];
        //         }
        //     }
        //
        //     return null;
        // };
        //
        // XLabsApi.firstSupportedExtension = function () {
        //     var list = XLabsApi.getExtensionList();
        //     for (var i = 0; i < list.length; ++i) {
        //         if (utils.compareVersions(list[i].version, XLabsApi.supportedVersion()) >= 0) {
        //             return list[i];
        //         }
        //     }
        //
        //     return null;
        // };

        XLabsApi.supportedVersion = function () {
            return '2.7.0';
        };

        XLabsApi.NoExtensionError = utils.customErrorClass('NoExtensionError');

        XLabsApi.prototype.init = function (options) {
            var _this = this;

            var options = options || {};
            options.extensionId = options.extensionId || null;
            options.callbackReady = options.callbackReady || null;

            options.callbackState = options.callbackState || null;
            options.callbackIdPath = options.callbackIdPath || null;
            options.developerToken = options.developerToken || null;

            _this.initImpl(options);
        };

        XLabsApi.prototype.send = function (type, content) {
            var _this = this;
            _this._csPort.send({
                type: type,
                content: content
            });
        };

        XLabsApi.prototype.initImpl = function (options) {
            var _this = this;

            if (!options.extensionId) {
                throw new Error('Must specify the extension ID.');
            }

            // if (!XLabs.extensionInstalled(options.extensionId)) {
            //     throw new Error('xLabs chrome extension is not installed, looking for extension id: ' + options.extensionId);
            // }

            // var list = getExtensionList();

            // We already checked that the extension exists.
            // _this._extensionInfo = list[options.extensionId];
            _this._extensionInfo = {};
            _this._extensionInfo.id = options.extensionId;

            _this._callbackReady = options.callbackReady;
            _this._callbackState = options.callbackState;
            _this._callbackIdPath = options.callbackIdPath;
            _this._developerToken = options.developerToken;

            function addListeners(port) {

                port.addListener(_this.onApiState.bind(_this));
                port.addListener(_this.onApiIdPath.bind(_this));

                // One time only function. Declare as local to get the same reference when we want to remove it.
                var onApiReady = function(body) {

                    console.log('onApiReady', body);

                    if (body.type != TYPE_CS_READY) {
                        return;
                    }

                    port.removeListener(onApiReady);
                    _this.pageCheck();
                    _this._callbackReady && _this._callbackReady();
                };

                port.addListener(onApiReady);

                // Ask the content script to send a ready message when it's ready.
                _this.send(TYPE_IF_CS_READY);

                console.log('Send message to cs: ' + TYPE_IF_CS_READY);
            }

            // Connect to the content script server.
            WindowConnection.connect({
                remoteWindow: window,
                remoteName: 'xLabsCsServers.page'

            }, function (port) {
                console.log(Date.now() - window.startTime);

                _this._csPort = port;

                addListeners(port);
            });

            // Allow embedding inside <webview>. Setup a server to listen.
            _this.pageServers = {};
            _this.pageServers.cs = new WindowConnection('xLabsPageServers.cs');
            _this.pageServers.cs.onConnect.addListener(function (port) {

                _this._csPort = port;

                console.log('Connected with client', port);

                addListeners(port);
            });
        };

        // Returns only the installed extension that are supported by this API.
        XLabsApi.getExtensionList = function () {
            var ret = [];
            var list = JSON.parse(document.documentElement.getAttribute(EXTENSION_LIST_ATTR) || '[]');
            list.forEach(function (item) {
                if (utils.compareVersions(item.version, XLabsApi.supportedVersion()) >= 0) {
                    ret.push(item);
                }
            });
            return ret;
        };

        XLabsApi.extensionInstalled = function (extensionIds) {
            var list = XLabsApi.getExtensionList();
            for (var i = 0; i < list.length; ++i) {
                if (extensionIds.some(function (id) {
                    return list[i].extensionId == id;
                })) {
                    return list[i];
                }
            }
            return null;
        };

        XLabsApi.isExtension = function () {
            return !!chrome.runtime.getManifest;
        };

        XLabsApi.prototype.getConfig = function (path) {
            var _this = this;
            var value = getObjectProperty(_this._config, path);
            return value;
        };

        XLabsApi.prototype.getIntConfig = function (path) {
            return parseInt(this.getConfig(path));
        };

        XLabsApi.prototype.getFloatConfig = function (path) {
            return parseFloat(this.getConfig(path));
        };

        XLabsApi.prototype.setConfig = function (path, value) {
            var _this = this;

            console.log('Sending config message to content script.');

            _this.send(TYPE_CONFIG, {
                token: _this._developerToken, // may be null
                path: path,
                value: value
            });
        };

        ///////////////////////////////////////////////////////////////////////////////////////////////////
        // Utils
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        function getObjectProperty(object, path) {
            if (( object == undefined ) || ( object == null )) {
                return '';
            }
            //console.log( 'Uril util'+path );
            var parts = path.split('.'),
                last = parts.pop(),
                l = parts.length,
                i = 1,
                current = parts[0];

            while (( object = object[current] ) && i < l) {
                current = parts[i];
                //console.log( 'Util object: '+JSON.stringify( object ) );
                i++;
            }

            if (object) {
                //console.log( 'Util result: '+object[ last ] );
                return object[last];
            }
        }

        ///////////////////////////////////////////////////////////////////////////////////////////////////
        // Calibration
        // Truth - data for gaze calibration. Basically you need to tell xLabs where the person is looking
        // at a particular time.
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        XLabsApi.prototype.resetCalibrationTruth = function () {
            var _this = this;
            _this._t1 = 0;
        };

        XLabsApi.prototype.updateCalibrationTruth = function (xScreen, yScreen) {
            var _this = this;
            var t1 = _this._t1;
            var t2 = _this.getTimestamp();

            if (t1 <= 0) { // none set
                t1 = t2;
                t2 = t2 + 1; // ensure duration at least 1 and positive
            }

            _this.addCalibrationTruth(t1, t2, xScreen, yScreen);

            _this._t1 = t2; // change the timestamp
        };

        XLabsApi.prototype.addCalibrationTruth = function (t1, t2, xScreen, yScreen) {
            var _this = this;
            // Defines ordering of values
            // t1,t2,xs,ys
            // For truth, also used for clicks
            var csv = t1 + ',' + t2 + ',' + parseInt(xScreen) + ',' + parseInt(yScreen);
            //console.log( 'xLabs truth: '+csv );
            _this.setConfig('truth.append', csv);
        };

        XLabsApi.prototype.calibrate = function (id) {
            var _this = this;
            var request = '3p';
            if (id) {
                request = id;
            }

            _this.setConfig('calibration.request', request);
            console.log('xLabs: Calibrating...');
        };

        XLabsApi.prototype.calibrationClear = function () {
            var _this = this;
            _this.setConfig('calibration.clear', 1);
            console.log('xLabs: Clearing calibration...');
        };

        ///////////////////////////////////////////////////////////////////////////////////////////////////
        // Time - in a compatible format.
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        XLabsApi.prototype.getTimestamp = function () {
            // unified function to get suitable timestamps
            return Date.now();
        };

        ///////////////////////////////////////////////////////////////////////////////////////////////////
        // Resolution
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        XLabsApi.prototype.getDpi = function () {
            var dppx = window.devicePixelRatio ||
                (  window.matchMedia
                && window.matchMedia('(min-resolution: 2dppx), (-webkit-min-device-pixel-ratio: 1.5),(-moz-min-device-pixel-ratio: 1.5),(min-device-pixel-ratio: 1.5)').matches ? 2 : 1 )
                || 1;

            var w = screen.width  * dppx;
            var h = screen.height * dppx;
            return this.calcDpi(w, h, 13.3, 'd');
        };

        XLabsApi.prototype.calcDpi = function (w, h, d, opt) {
            // Calculate PPI/DPI
            // Source: http://dpi.lv/
            w > 0 || (w = 1);
            h > 0 || (h = 1);
            opt || (opt = 'd');
            var dpi = (opt == 'd' ? Math.sqrt(w * w + h * h) : opt == 'w' ? w : h) / d;
            return dpi > 0 ? Math.round(dpi) : 0;
        };

        ///////////////////////////////////////////////////////////////////////////////////////////////////
        // Coordinate conversion
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        XLabsApi.prototype.devicePixelRatio = function () {
            var _this = this;
            var ratio = _this.getFloatConfig('browser.screen.devicePixelRatioWithoutZoom');
            if (!ratio) {
                return null
            }
            var ratio = parseInt(ratio); // The default zoom should always be an integer.
            if (ratio === 0) {
                return null;
            }
            return window.devicePixelRatio / ratio;
        };

        XLabsApi.prototype.documentOffset = function () {
            var _this = this;
            if (!_this.documentOffsetReady()) {
                throw new Error('xLabs: Should not call scr2doc() unless mouse moved, i.e. browser.document.offset.ready == 1');
            }
            var x = _this.getIntConfig('browser.document.offset.x');
            var y = _this.getIntConfig('browser.document.offset.y');
            return {
                x: x,
                y: y
            };
        };

        XLabsApi.prototype.documentOffsetReady = function () {
            return !!this.getIntConfig('browser.document.offset.ready');
        };

        XLabsApi.prototype._scr2docImpl = function (screenCoord, windowCoord, config) {
            var _this = this;
            if (!_this.documentOffsetReady()) {
                throw new Error('xLabs: Check documentOffsetReady() first before calling any scr2doc functions.');
            }

            return screenCoord - windowCoord - _this.getIntConfig(config);
        };

        XLabsApi.prototype.scr2docX = function (screenX) {
            return this._scr2docImpl(screenX, window.screenX, 'browser.document.offset.x');
        };

        XLabsApi.prototype.scr2docY = function (screenY) {
            return this._scr2docImpl(screenY, window.screenY, 'browser.document.offset.y');
        };

        XLabsApi.prototype.scr2doc = function (screenX, screenY) {
            return {
                x: this.scr2docX(screenX),
                y: this.scr2docY(screenY)
            }
        };

        XLabsApi.prototype._doc2scrImpl = function (documentCoord, windowCoord, config) {
            var _this = this;
            if (!_this.documentOffsetReady()) {
                throw new Error('xLabs: Check documentOffsetReady() first before calling any doc2scr functions.');
            }
            return documentCoord + windowCoord + _this.getIntConfig(config);
        };

        XLabsApi.prototype.doc2scrX = function (documentX) {
            return this._doc2scrImpl(documentX, window.screenX, 'browser.document.offset.x');
        };

        XLabsApi.prototype.doc2scrY = function (documentY) {
            return this._doc2scrImpl(documentY, window.screenY, 'browser.document.offset.y');
        };

        XLabsApi.prototype.doc2scr = function (documentX, documentY) {
            return {
                x: this.doc2scrX(documentX),
                y: this.doc2scrY(documentY)
            }
        };

        ///////////////////////////////////////////////////////////////////////////////////////////////////
        // Setup
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        XLabsApi.prototype.onApiState = function (body) {
            var _this = this;

            if (body.type != TYPE_STATE) {
                return;
            }

            _this._config = body.content;
            _this._callbackState && _this._callbackState();
        };

        XLabsApi.prototype.onApiIdPath = function (body) {
            var _this = this;

            if (body.type != TYPE_ID_PATH) {
                return;
            }

            _this._callbackIdPath && _this._callbackIdPath(body.content.id, body.content.path);
        };

        // Returns the version number of the extension, or null if extension not installed.
        XLabsApi.prototype.extensionInfo = function () {
            // Create a copy.
            return JSON.parse(JSON.stringify(this._extensionInfo));
        };

        XLabsApi.prototype.pageCheck = function () {
            var _this = this;

            console.log('xlabs.js pageCheck() called');
            var content = {
                token: _this._developerToken  // may be null or undefined
            };

            // An extension is asking for permission, send a message directly to the background script so we directly
            // verifiy the sender id.
            if (XLabsApi.isExtension()) {
                chrome.runtime.sendMessage(_this._extensionInfo.id, body);
                console.log('sent message to xlabs background script with extension ID');
            }
            // From the a website
            else {
                _this.send(TYPE_REQUEST_ACCESS, content);
            }
        };

        // Legacy support
        // function deprecate(f) {
        //     var _this = this;
        //     return function () {
        //         console.warn('This function has been deprecate and will be removed in future releases.');
        //         return f.apply(_this, arguments);
        //     };
        // }
        //
        // xLabs = {};
        // xLabs.setup = deprecate(function (callbackReady, callbackState, callbackIdPath, developerToken) {
        //
        //     var list = getExtensionList();
        //
        //     if (list.length == 0) {
        //         throw new NoExtensionError('No extension installed.');
        //     }
        //
        //     var extensionId = list[0].extensionId;
        //
        //     console.log('Using the first xlabs extension found on the system, id: ' + extensionId);
        //
        //     xLabs = new XLabsApi({
        //         extensionId: extensionId,
        //         callbackReady: callbackReady,
        //         callbackState: callbackState,
        //         callbackIdPath: callbackIdPath,
        //         developerToken: developerToken
        //     });
        //
        //     // Makesure all the static fucntion are there.
        //     setupLegacy();
        // });
        //
        // function setupLegacy() {
        //     xLabs.extensionVersion = deprecate(function () {
        //         return document.documentElement.getAttribute('data-xlabs-extension-version');
        //     });
        //
        //     xLabs.hasExtension = deprecate(function() {
        //         return document.documentElement.getAttribute('data-xlabs-extension') ||
        //             document.documentElement.getAttribute('data-xlabs-extension-version') // to be compatible with < 2.5.2
        //     });
        // }
        //
        // // Makesure all the static functions are there.
        // setupLegacy();

        return XLabsApi;
    }



    function legacy() {

        return {

            ///////////////////////////////////////////////////////////////////////////////////////////////////
            // Variables
            ///////////////////////////////////////////////////////////////////////////////////////////////////
            config : null,
            callbackReady : null,
            callbackState : null,
            callbackIdPath : null,
            requestAccessIdx : 0,
            developerToken : null,

            XLABS_EXTENSION_ID : "licbccoefgmmbgipcgclfgpbicijnlga",

            ///////////////////////////////////////////////////////////////////////////////////////////////////
            // Core API
            ///////////////////////////////////////////////////////////////////////////////////////////////////
            isApiReady : function() {
                return document.documentElement.getAttribute( 'data-xlabs-extension-ready' ) == "1";
            },

            getConfig : function( path ) {
                var value = xLabs.getObjectProperty( xLabs.config, path );
                //console.log( "getConfig( "+path+" = "+ value + " )" );
                return value;
            },

            setConfig : function( path, value ) {
                window.postMessage( {
                    target: "xLabs",
                    token: xLabs.token, // may be null
                    config: {
                        path: path,
                        value: value
                    }
                }, "*" );
            },

            ///////////////////////////////////////////////////////////////////////////////////////////////////
            // JSON
            ///////////////////////////////////////////////////////////////////////////////////////////////////
            getObjectProperty : function( object, path ) {
                if( ( object == undefined ) || ( object == null ) ) {
                    return "";
                }
                //console.log( "Uril util"+path );
                var parts = path.split('.'),
                    last = parts.pop(),
                    l = parts.length,
                    i = 1,
                    current = parts[ 0 ];

                while( ( object = object[ current ] ) && i < l ) {
                    current = parts[ i ];
                    //console.log( "Util object: "+JSON.stringify( object ) );
                    i++;
                }

                if( object ) {
                    //console.log( "Util result: "+object[ last ] );
                    return object[ last ];
                }
            },

            ///////////////////////////////////////////////////////////////////////////////////////////////////
            // Calibration
            // Truth - data for gaze calibration. Basically you need to tell xLabs where the person is looking
            // at a particular time.
            ///////////////////////////////////////////////////////////////////////////////////////////////////
            t1 : 0,

            resetCalibrationTruth : function() {
                xLabs.t1 = 0;
            },

            updateCalibrationTruth : function( xScreen, yScreen ) {
                var t1 = xLabs.t1;
                var t2 = xLabs.getTimestamp();

                if( t1 <= 0 ) { // none set
                    t1 = t2;
                    t2 = t2 +1; // ensure duration at least 1 and positive
                }

                xLabs.addCalibrationTruth( t1, t2, xScreen, yScreen );

                xLabs.t1 = t2; // change the timestamp
            },

            addCalibrationTruth : function( t1, t2, xScreen, yScreen ) {
                // Defines ordering of values
                // t1,t2,xs,ys
                // For truth, also used for clicks
                var csv = t1 + "," + t2 + "," + parseInt( xScreen  ) + "," + parseInt( yScreen );
                //console.log( "xLabs truth: "+csv );
                xLabs.setConfig( "truth.append", csv );
            },

            calibrate : function( id ) {
                var request = "3p";
                if( id ) {
                    request = id;
                }

                xLabs.setConfig( "calibration.request", request );
                console.log( "xLabs: Calibrating..." );
            },

            calibrationClear : function() {
                xLabs.setConfig( "calibration.clear", request );
                console.log( "xLabs: Clearing calibration..." );
            },

            ///////////////////////////////////////////////////////////////////////////////////////////////////
            // Time - in a compatible format.
            ///////////////////////////////////////////////////////////////////////////////////////////////////
            getTimestamp : function() {
                // unified function to get suitable timestamps
                var dateTime = new Date();
                var timestamp = dateTime.getTime();
                return timestamp;
            },

            ///////////////////////////////////////////////////////////////////////////////////////////////////
            // Resolution
            ///////////////////////////////////////////////////////////////////////////////////////////////////
            getDpi : function() {
                var dppx = window.devicePixelRatio ||
                    (    window.matchMedia
                    && window.matchMedia( "(min-resolution: 2dppx), (-webkit-min-device-pixel-ratio: 1.5),(-moz-min-device-pixel-ratio: 1.5),(min-device-pixel-ratio: 1.5)" ).matches? 2 : 1 )
                    || 1;

                var w = ( screen.width  * dppx );
                var h = ( screen.height * dppx );
                return this.calcDpi( w, h, 13.3, 'd' );
            },

            calcDpi : function( w, h, d, opt ) {
                // Calculate PPI/DPI
                // Source: http://dpi.lv/
                w>0 || (w=1);
                h>0 || (h=1);
                opt || (opt='d');
                var dpi = (opt=='d' ? Math.sqrt(w*w + h*h) : opt=='w' ? w : h) / d;
                return dpi>0 ? Math.round(dpi) : 0;
            },

            ///////////////////////////////////////////////////////////////////////////////////////////////////
            // Coordinate conversion
            ///////////////////////////////////////////////////////////////////////////////////////////////////
            devicePixelRatio : function() {
                var ratio = parseFloat( xLabs.getConfig("browser.screen.devicePixelRatioWithoutZoom") );
                if( !ratio ) {
                    return null
                }
                var ratio = parseInt( ratio );
                if( ratio === 0 ) {
                    return null;
                }
                return window.devicePixelRatio / ratio;
            },


            documentOffset : function() {
                if( !xLabs.documentOffsetReady() ) {
                    throw "xLabs: Should not call scr2doc() unless mouse moved, i.e. browser.document.offset.ready == 1";
                }
                var x = parseInt( xLabs.getConfig( "browser.document.offset.x" ) );
                var y = parseInt( xLabs.getConfig( "browser.document.offset.y" ) );
                return { x: x, y: y };
            },

            documentOffsetReady : function() {
                var ready = xLabs.getConfig( "browser.document.offset.ready" );
                if( ready.localeCompare( "1" ) != 0 ) {
                    return false;
                }
                return true;
            },

            scr2docX: function( screenX ) {
                if( !xLabs.documentOffsetReady() ) {
                    throw "xLabs: Should not call scr2doc() unless mouse moved, i.e. browser.document.offset.ready == 1";
                }

                var xOffset = parseInt(xLabs.getConfig( "browser.document.offset.x" ));
                return screenX - window.screenX - xOffset;
            },

            scr2docY: function( screenY ) {
                if( !xLabs.documentOffsetReady() ) {
                    throw "xLabs: Should not call scr2doc() unless mouse moved, i.e. browser.document.offset.ready == 1";
                }

                var yOffset = parseInt(xLabs.getConfig( "browser.document.offset.y" ));
                return screenY - window.screenY - yOffset;
            },

            scr2doc: function( screenX, screenY ) {
                return {
                    x: xLabs.scr2docX( screenX ),
                    y: xLabs.scr2docY( screenY )
                }
            },

            doc2scrX: function( documentX ) {
                if( !xLabs.documentOffsetReady() ) {
                    throw "xLabs: Should not call scr2doc() unless mouse moved, i.e. browser.document.offset.ready == 1";
                }
                var xOffset = parseInt(xLabs.getConfig( "browser.document.offset.x" ));
                return documentX + window.screenX + xOffset;
            },

            doc2scrY: function( documentY ) {
                if( !xLabs.documentOffsetReady() ) {
                    throw "xLabs: Should not call scr2doc() unless mouse moved, i.e. browser.document.offset.ready == 1";
                }
                var yOffset = parseInt(xLabs.getConfig( "browser.document.offset.y" ));
                return documentY + window.screenY + yOffset;
            },

            doc2scr: function( documentX, documentY ) {
                return {
                    x: xLabs.doc2scrX( documentX ),
                    y: xLabs.doc2scrY( documentY )
                }
            },

            ///////////////////////////////////////////////////////////////////////////////////////////////////
            // Setup
            ///////////////////////////////////////////////////////////////////////////////////////////////////
            onApiReady : function() {

                xLabs.pageCheck()

                if( xLabs.callbackReady != null ) {
                    xLabs.callbackReady();
                }
            },

            onApiState : function( config ) {
                xLabs.config = config;
                if( xLabs.callbackState != null ) {
                    xLabs.callbackState();
                }
            },

            onApiIdPath : function( detail ) {
                if( xLabs.callbackIdPath != null ) {
                    xLabs.callbackIdPath( detail.id, detail.path );
                }
            },

            // Returns the version number of the extension, or null if extension not installed.
            extensionVersion : function() {
                return document.documentElement.getAttribute('data-xlabs-extension-version');
            },

            hasExtension : function() {
                return document.documentElement.getAttribute('data-xlabs-extension') ||
                    document.documentElement.getAttribute('data-xlabs-extension-version') // to be compatible with < 2.5.2
            },

            isExtension : function() {
                return chrome.runtime.getManifest !== undefined
            },

            pageCheck : function() {
                console.log( "xlabs.js pageCheck() called")
                var message = {
                    target : "xLabs",
                    action: "request-access",
                    token: xLabs.developerToken // may be null or undefined
                };

                // An extension is asking for permission, send a message directly to the background script.
                if( xLabs.isExtension() ) {
                    chrome.runtime.sendMessage( xLabs.XLABS_EXTENSION_ID, message );
                    console.log( "send message to xlabs background script with extension ID");
                }
                // From the a website
                else {
                    window.postMessage( message, "*" );
                    console.log( message );
                    console.log( "posting message to content script.");
                }
            },

            setup : function( callbackReady, callbackState, callbackIdPath, developerToken ) {
                if( !xLabs.hasExtension() ) {
                    console.error("xLabs chrome extension is not installed");
                    return;
                }

                xLabs.callbackReady = callbackReady;
                xLabs.callbackState = callbackState;
                xLabs.callbackIdPath = callbackIdPath;

                if( developerToken ) {
                    xLabs.developerToken = developerToken
                }

                // If the API is already setup, then we can call the callback without needing
                // to listen to the ready event. But since it's meant to be a callback we
                // shall defer calling the callback in the event loop, which would be the expectation
                // when registering callbacks.
                if( xLabs.isApiReady() ) {
                    setTimeout( function() {
                        xLabs.onApiReady();
                    }, 0 );
                }
                // Not ready yet, we can wait for the event.
                else {
                    // add event listeners
                    document.addEventListener( "xLabsApiReady", function() {
                        xLabs.onApiReady();
                    })
                }

                document.addEventListener( "xLabsApiState", function( event ) {
                    xLabs.onApiState( event.detail );
                });

                document.addEventListener( "xLabsApiIdPath", function( event ) {
                    xLabs.onApiIdPath( event.detail );
                });
            }

        };
    }

    if (typeof module !== 'undefined' && module.exports) {
        var dst = module.exports = {};
    } else {
        var dst = window;
    }

    // Always expose xLabs.
    dst.xLabs = legacy();

    // Expose XLabsApi when the version is >= XLabsApi.supportedVersion()
    // var XLabsApi = XLabsApiImpl();
    // if (XLabsApi.getExtensionList().some(function (info) {
    //
    //     return utils.compareVersions(info.version, XLabsApi.supportedVersion()) >= 0;
    //
    // })) {

        dst.XLabsApi = XLabsApiImpl();
    // }

})();























