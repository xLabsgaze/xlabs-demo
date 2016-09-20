
var XLabsApi = null;

// Legacy support
var xLabs = null;

(function () {
    var EXTENSION_LIST_ATTR = 'data-xlabs-extension-list';
    var MSG_NAME = 'xlabs';
    var MSG_CONTENT_SCRIPT = 'content-script';
    var MSG_PAGE = 'page';

    var TYPE_STATE = 'state';
    var TYPE_ID_PATH = 'id-path';
    var TYPE_READY = 'ready';
    var TYPE_IS_READY = 'is-ready';


    function customErrorClass(className) {

        var customError = function (message, customProperty) {
            var error = Error.call(this, message);
            this.name = className;
            this.message = error.message;
            this.stack = error.stack;
            this.customProperty = customProperty;
        };

        customError.prototype = Object.create(Error.prototype);
        customError.prototype.constructor = customError;

        return customError;
    }


    function ContentScriptPort(extensionId) {
        var _this = this;
        _this._extensionId = extensionId;
        _this._listenersMap = {};

        window.addEventListener('message', _this.onEvent.bind(_this));
    }

    // use the parent window's extension.
    ContentScriptPort.postMessageUp = function (message, targetDomain, targetWindow) {

        function postMessageImpl(message, targetDomain, targetWindow) {
            targetWindow.postMessage(message, targetDomain);

            if (targetWindow.parent && targetWindow.parent != targetWindow) {
                postMessageImpl(message, targetDomain, targetWindow.parent);
            }
        }

        postMessageImpl(message, targetDomain, targetWindow || window);
    };


    ContentScriptPort.prototype.send = function (type, content) {
        var _this = this;
        ContentScriptPort.postMessageUp({
            name: MSG_NAME,
            to: MSG_CONTENT_SCRIPT,
            toId: _this._extensionId,
            type: type,
            content: content
        }, '*');
    };

    ContentScriptPort.prototype.addListener = function (type, listener) {
        var _this = this;

        var array = _this._listenersMap[type] = _this._listenersMap[type] || [];

        // Don't include duplicates.
        if (array.every(function (t) { return t != listener; })) {
            array.push(listener);
        }
    };

    ContentScriptPort.prototype.removeListener = function (type, listener) {
        var _this = this;

        var array = _this._listenersMap[type];
        if (array) {
            for (var i = 0; i < array.length; ++i) {
                if (array[i] == listener) {
                    array.splice(i, 1);
                    break; // Since there should not be any duplicates.
                }
            }
        }
    };

    ContentScriptPort.prototype.onEvent = function (event) {
        var _this = this;

        var data = event.data;
        if (data.name != MSG_NAME ||
            data.to != MSG_PAGE
        ) {
            console.log('Ignoring message not addressed to me: ', data.name, data.to);
            return;
        }

        var array = _this._listenersMap[data.type];
        if (array) {
            array.forEach(function (listener) {
                listener(data.content);
            });
        }
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Core API
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    XLabsApi = function (options) {
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

        _this.init(options);
    };

    XLabsApi.NoExtensionError = customErrorClass('NoExtensionError');

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

        _this._csPort = new ContentScriptPort(_this._extensionInfo.id);

        _this._callbackReady = options.callbackReady;
        _this._callbackState = options.callbackState;
        _this._callbackIdPath = options.callbackIdPath;
        _this._developerToken = options.developerToken;

        // _this.isApiReady(function (ready) {
        //     // If the API is already setup, then we can call the callback without needing
        //     // to listen to the ready event. But since it's meant to be a callback we
        //     // shall defer calling the callback in the event loop, which would be the expectation
        //     // when registering callbacks.
        //     setTimeout(function () {
        //         _this.onApiReady();
        //     }, 0);
        // }
        // else {
        //     // Not ready yet, we can wait for the event.
        //     _this._csPort.addListener('ready', _this.onApiReady.bind(_this));
        // }

        _this._csPort.addListener(TYPE_STATE, _this.onApiState.bind(_this));
        _this._csPort.addListener(TYPE_ID_PATH, _this.onApiIdPath.bind(_this));

        // One time only function. Declare as local to get the same reference when we want to remove it.
        var onApiReady = function() {
            _this._csPort.removeListener(TYPE_READY, onApiReady);
            _this.pageCheck();
            _this._callbackReady && _this._callbackReady();
        }
        _this._csPort.addListener(TYPE_READY, onApiReady);

        // Ask the content script to send a 'ready' message when the API is ready.
        _this._csPort.send(TYPE_IS_READY);
    };

    function getExtensionList() {
        return JSON.parse(document.documentElement.getAttribute(EXTENSION_LIST_ATTR) || '{}');
    }

    XLabsApi.extensionInstalled = function (extensionId) {
        var list = getExtensionList();
        return !!list[extensionId];
    };

    XLabsApi.isExtension = function () {
        return !!chrome.runtime.getManifest;
    };

    XLabsApi.prototype.isApiReady = function () {
        var _this = this;
        var list = JSON.parse(document.documentElement.getAttribute(EXTENSION_LIST_ATTR) || '{}');
        var t = list[_this._extensionInfo.id];
        return t || t.ready;
    };

    XLabsApi.prototype.getConfig = function (path) {
        var _this = this;
        var value = getObjectProperty(_this._config, path);
        //console.log( 'getConfig( '+path+' = '+ value + ' )' );
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
        _this._csPort.send('config', {
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
    XLabsApi.prototype.onApiState = function (config) {
        var _this = this;
        _this._config = config;
        _this._callbackState && _this._callbackState();
    };

    XLabsApi.prototype.onApiIdPath = function (detail) {
        var _this = this;
        _this._callbackIdPath && _this._callbackIdPath(detail.id, detail.path);
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
            _this._csPort.send('request-access', content);
            console.log(content);
            console.log('sending message to content script.');
        }
    };

    // Legacy support
    function deprecate(f) {
        var _this = this;
        return function () {
            console.warn('This function has been deprecate and will be removed in future releases.');
            return f.apply(_this, arguments);
        };
    }

    xLabs = {};
    xLabs.setup = deprecate(function (callbackReady, callbackState, callbackIdPath, developerToken) {

        var list = getExtensionList();

        if (list.length == 0) {
            throw new NoExtensionError('No extension installed.');
        }

        var extensionId = Object.keys(list)[0];

        console.log('Using the first xlabs extension found on the system, id: ' + extensionId);

        xLabs = new XLabsApi({
            extensionId: extensionId,
            callbackReady: callbackReady,
            callbackState: callbackState,
            callbackIdPath: callbackIdPath,
            developerToken: developerToken
        });

        // Makesure all the static fucntion are there.
        setupLegacy();
    });

    function setupLegacy() {
        xLabs.extensionVersion = deprecate(function () {
            return document.documentElement.getAttribute('data-xlabs-extension-version');
        });

        xLabs.hasExtension = deprecate(function() {
            return document.documentElement.getAttribute('data-xlabs-extension') ||
                document.documentElement.getAttribute('data-xlabs-extension-version') // to be compatible with < 2.5.2
        });
    }

    // Makesure all the static fucntion are there.
    setupLegacy();

})();
