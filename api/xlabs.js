(function () {
    var EXTENSION_LIST_ATTR = 'data-xlabs-extension-list';

    function ContentScriptPort(extensionId) {
        var _this = this;
        _this._extensionId = extensionId;
        _this._listeners = [];

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


    ContentScriptPort.prototype.send = function (body) {
        var _this = this;
        ContentScriptPort.postMessageUp({
            name: 'xLabs',
            to: constants.CONTENT_SCRIPT,
            toId: _this._extensionId,
            body: body
        }, '*');
    };

    ContentScriptPort.prototype.addListener = function (listener) {
        var _this = this;

        if (!_.includes(_this._listeners, listener)) {
            _this._listeners.push(listener);
        }
    };

    ContentScriptPort.prototype.removeListener = function (listener) {
        var _this = this;

        _.remove(_this._listeners, listener);
    };

    ContentScriptPort.prototype.onEvent = function (event) {
        var _this = this;

        var data = event.data;
        if (data.name != constants.NAME ||
            data.to != constants.PAGE
        ) {
            console.log('Ignoring message not addressed to me: ', data.name, data.to);
            return;
        }

        _this._listeners.forEach(function (listener) {
            listener(data.body);
        });
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Core API
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    function XLabs(options) {
        var _this = this;
        _this._extensionInfo = null;
        _this._config = null;
        _this._callbackReady = null;
        _this._callbackState = null;
        _this._callbackIdPath = null;
        _this._requestAccessIdx = 0;
        _this._developerToken = null;
        _this._extensionId = null;
        _this._csPort = null;
        _this._t1 = 0;

        _this.setup(options);
    }

    function getExtensionList() {
        return JSON.parse(document.documentElement.getAttribute(EXTENSION_LIST_ATTR) || '{}');
    }

    XLabs.hasExtension = function (extensionId) {
        var list = getExtensionList();
        if (extensionId) {
            return !!list[extensionId];
        } else {
            return Object.keys(list).length > 0;
        }
    };

    XLabs.isExtension = function () {
        return !!chrome.runtime.getManifest;
    };


    XLabs.prototype.setup = function (options) {
        var _this = this;

        var options = options || {};

        if (!XLabs.hasExtension(options.extensionId)) {
            var msg = 'xLabs chrome extension is not installed';
            if (options.extensionId) {
                msg += ', looking for extension id: ' + options.extensionId;
            }
            throw new Error(msg);
        }

        var list = getExtensionList();

        if (!options.extensionId) {
            // Pick the first on the list
            options.extensionId = Object.keys(list)[0];
        }

        // We already checked that the extension exists.
        _this._extensionInfo = list[options.extensionId];
        _this._extensionInfo.id = options.extensionId;

        _this._csPort = new ContentScriptPort(_this._extensionId);

        _this._callbackReady = options.callbackReady;
        _this._callbackState = options.callbackState;
        _this._callbackIdPath = options.callbackIdPath;
        _this._developerToken = options.developerToken;

        // If the API is already setup, then we can call the callback without needing
        // to listen to the ready event. But since it's meant to be a callback we
        // shall defer calling the callback in the event loop, which would be the expectation
        // when registering callbacks.
        if (_this.isApiReady()) {
            setTimeout(function () {
                _this.onApiReady();
            }, 0);
        }
        // Not ready yet, we can wait for the event.
        else {
            // add event listeners
            document.addEventListener("xLabsApiReady", function () {
                _this.onApiReady();
            })
        }

        document.addEventListener("xLabsApiState", function (event) {
            _this.onApiState(event.detail);
        });

        document.addEventListener("xLabsApiIdPath", function (event) {
            _this.onApiIdPath(event.detail);
        });
    };

    XLabs.prototype.isApiReady = function () {
        var _this = this;
        var list = JSON.parse(document.documentElement.getAttribute(EXTENSION_LIST_ATTR) || '{}');
        var t = list[_this._extensionInfo.id];
        return t || t.ready;
    };

    XLabs.prototype.getConfig = function (path) {
        var _this = this;
        var value = _this.getObjectProperty(_this._config, path);
        //console.log( 'getConfig( '+path+' = '+ value + ' )' );
        return value;
    };

    XLabs.prototype.getIntConfig = function (path) {
        return parseInt(this.getConfig(path));
    };

    XLabs.prototype.getFloatConfig = function (path) {
        return parseFloat(this.getConfig(path));
    };

    XLabs.prototype.setConfig = function (path, value) {
        var _this = this;
        _csPort.send({
            token: _this._token, // may be null
            config: {
                path: path,
                value: value
            }
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
    XLabs.prototype.resetCalibrationTruth = function () {
        var _this = this;
        _this._t1 = 0;
    };

    XLabs.prototype.updateCalibrationTruth = function (xScreen, yScreen) {
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

    XLabs.prototype.addCalibrationTruth = function (t1, t2, xScreen, yScreen) {
        var _this = this;
        // Defines ordering of values
        // t1,t2,xs,ys
        // For truth, also used for clicks
        var csv = t1 + ',' + t2 + ',' + parseInt(xScreen) + ',' + parseInt(yScreen);
        //console.log( 'xLabs truth: '+csv );
        _this.setConfig('truth.append', csv);
    };

    XLabs.prototype.calibrate = function (id) {
        var _this = this;
        var request = '3p';
        if (id) {
            request = id;
        }

        _this.setConfig("calibration.request", request);
        console.log("xLabs: Calibrating...");
    };

    XLabs.prototype.calibrationClear = function () {
        var _this = this;
        _this.setConfig("calibration.clear", 1);
        console.log("xLabs: Clearing calibration...");
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Time - in a compatible format.
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    XLabs.prototype.getTimestamp = function () {
        // unified function to get suitable timestamps
        return Date.now();
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Resolution
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    XLabs.prototype.getDpi = function () {
        var dppx = window.devicePixelRatio ||
            (  window.matchMedia
            && window.matchMedia("(min-resolution: 2dppx), (-webkit-min-device-pixel-ratio: 1.5),(-moz-min-device-pixel-ratio: 1.5),(min-device-pixel-ratio: 1.5)").matches ? 2 : 1 )
            || 1;

        var w = screen.width  * dppx;
        var h = screen.height * dppx;
        return this.calcDpi(w, h, 13.3, 'd');
    };

    XLabs.prototype.calcDpi = function (w, h, d, opt) {
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
    XLabs.prototype.devicePixelRatio = function () {
        var _this = this;
        var ratio = _this.getFloatConfig("browser.screen.devicePixelRatioWithoutZoom");
        if (!ratio) {
            return null
        }
        var ratio = parseInt(ratio); // The default zoom should always be an integer.
        if (ratio === 0) {
            return null;
        }
        return window.devicePixelRatio / ratio;
    };

    XLabs.prototype.documentOffset = function () {
        var _this = this;
        if (!_this.documentOffsetReady()) {
            throw "xLabs: Should not call scr2doc() unless mouse moved, i.e. browser.document.offset.ready == 1";
        }
        var x = _this.getIntConfig("browser.document.offset.x");
        var y = _this.getIntConfig("browser.document.offset.y");
        return {
            x: x,
            y: y
        };
    };

    XLabs.prototype.documentOffsetReady = function () {
        return !!this.getIntConfig("browser.document.offset.ready");
    };

    XLabs.prototype._scr2docImpl = function (screenCoord, windowCoord, config) {
        var _this = this;
        if (!_this.documentOffsetReady()) {
            throw new Error('xLabs: Check documentOffsetReady() first before calling any scr2doc functions.');
        }

        return screenCoord - windowCoord - _this.getIntConfig(config);
    };

    XLabs.prototype.scr2docX = function (screenX) {
        return this._scr2docImpl(screenX, window.screenX, 'browser.document.offset.x');
    };

    XLabs.prototype.scr2docY = function (screenY) {
        return this._scr2docImpl(screenY, window.screenY, 'browser.document.offset.y');
    };

    XLabs.prototype.scr2doc = function (screenX, screenY) {
        return {
            x: this.scr2docX(screenX),
            y: this.scr2docY(screenY)
        }
    };

    XLabs.prototype._doc2scrImpl = function (documentCoord, windowCoord, config) {
        var _this = this;
        if (!_this.documentOffsetReady()) {
            throw new Error('xLabs: Check documentOffsetReady() first before calling any doc2scr functions.');
        }
        return documentCoord + windowCoord + _this.getIntConfig(config);
    };

    XLabs.prototype.doc2scrX = function (documentX) {
        return this._doc2scrImpl(documentX, window.screenX, 'browser.document.offset.x');
    };

    XLabs.prototype.doc2scrY = function (documentY) {
        return this._doc2scrImpl(documentY, window.screenY, 'browser.document.offset.y');
    };

    XLabs.prototype.doc2scr = function (documentX, documentY) {
        return {
            x: this.doc2scrX(documentX),
            y: this.doc2scrY(documentY)
        }
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Setup
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    XLabs.prototype.onApiReady = function () {
        var _this = this;
        _this.pageCheck();
        _this._callbackReady && _this._callbackReady();
    };

    XLabs.prototype.onApiState = function (config) {
        var _this = this;
        _this._config = config;
        _this._callbackState && _this._callbackState();
    };

    XLabs.prototype.onApiIdPath = function (detail) {
        var _this = this;
        _this._callbackIdPath && _this._callbackIdPath(detail.id, detail.path);
    };

    // Returns the version number of the extension, or null if extension not installed.
    XLabs.prototype.extensionInfo = function () {
        // Create a copy.
        return JSON.parse(JSON.stringify(this._extensionInfo));
    };

    XLabs.prototype.pageCheck = function () {
        var _this = this;

        console.log('xlabs.js pageCheck() called');
        var body = {
            action: "request-access",
            token: _this._developerToken // may be null or undefined
        };

        // An extension is asking for permission, send a message directly to the background script so we directly
        // verifiy the sender id.
        if (XLabs.isExtension()) {
            chrome.runtime.sendMessage(_this._extensionInfo.id, body);
            console.log("sent message to xlabs background script with extension ID");
        }
        // From the a website
        else {
            _this._csPort.send(body);
            console.log(body);
            console.log("sending message to content script.");
        }
    };

})();