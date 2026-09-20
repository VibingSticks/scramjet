var __webpack_modules__ = ({
"./packages/bootstrap/src/clientcommon.ts"(__unused_rspack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  loadScript: () => (loadScript),
  registerSw: () => (registerSw)
});
async function registerSw(path) {
    const registration = await navigator.serviceWorker.register(path, {
        type: "classic",
        updateViaCache: "none"
    });
    await navigator.serviceWorker.ready;
    if (registration.active) {
        return registration.active;
    }
    if (registration.installing) {
        await new Promise((resolve)=>{
            const sw = registration.installing;
            if (sw.state === "activated") {
                resolve();
            } else {
                sw.addEventListener("statechange", function onChange() {
                    if (sw.state === "activated") {
                        sw.removeEventListener("statechange", onChange);
                        resolve();
                    }
                });
            }
        });
        return registration.active;
    }
    if (registration.waiting) {
        await new Promise((resolve)=>{
            navigator.serviceWorker.addEventListener("controllerchange", ()=>{
                resolve();
            }, {
                once: true
            });
        });
        return navigator.serviceWorker.controller;
    }
    throw new Error("No service worker found in registration");
}
function loadScript(url) {
    return new Promise((resolve, reject)=>{
        const script = document.createElement("script");
        script.src = url;
        script.onload = ()=>resolve();
        script.onerror = ()=>reject(new Error("Failed to load script " + url));
        document.head.appendChild(script);
    });
}


},

});
// The module cache
var __webpack_module_cache__ = {};

// The require function
function __webpack_require__(moduleId) {

// Check if module is in cache
var cachedModule = __webpack_module_cache__[moduleId];
if (cachedModule !== undefined) {
return cachedModule.exports;
}
// Create a new module (and put it into the cache)
var module = (__webpack_module_cache__[moduleId] = {
exports: {}
});
// Execute the module function
__webpack_modules__[moduleId](module, module.exports, __webpack_require__);

// Return the exports of the module
return module.exports;

}

// webpack/runtime/define_property_getters
(() => {
__webpack_require__.d = (exports, definition) => {
	for(var key in definition) {
        if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
            Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
        }
    }
};
})();
// webpack/runtime/has_own_property
(() => {
__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
})();
// webpack/runtime/make_namespace_object
(() => {
// define __esModule on exports
__webpack_require__.r = (exports) => {
	if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
		Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
	}
	Object.defineProperty(exports, '__esModule', { value: true });
};
})();
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  init: () => (init),
  loadRest: () => (loadRest)
});
/* import */ var _clientcommon__rspack_import_0 = __webpack_require__("./packages/bootstrap/src/clientcommon.ts");

async function init(cfg) {
    const sw = await (0,_clientcommon__rspack_import_0.registerSw)(cfg.swPath);
    return await loadRest(sw, cfg);
}
async function loadRest(sw, cfg) {
    await (0,_clientcommon__rspack_import_0.loadScript)(cfg.scramjetBundlePath);
    await (0,_clientcommon__rspack_import_0.loadScript)(cfg.scramjetControllerApiPath);
    await (0,_clientcommon__rspack_import_0.loadScript)(cfg.scramjetUtilsBundlePath);
    const resolvedWispPath = `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}${cfg.wispPath}`;
    let transport;
    if (cfg.transport === "epoxy") {
        await (0,_clientcommon__rspack_import_0.loadScript)(cfg.epoxyClientPath);
        const EpoxyCtor = window.EpoxyTransport.EpoxyClient;
        transport = new EpoxyCtor({
            wisp: resolvedWispPath
        });
    } else if (cfg.transport === "libcurl") {
        await (0,_clientcommon__rspack_import_0.loadScript)(cfg.libcurlClientPath);
        const LibcurlCtor = window.LibcurlTransport.LibcurlClient;
        transport = new LibcurlCtor({
            wisp: resolvedWispPath
        });
    } else if (cfg.transport === "bare") {
        throw new Error("Bare transport not implemented yet");
    //...
    }
    const { Controller, config } = window.$scramjetController;
    config.injectPath = cfg.scramjetControllerInjectPath;
    config.wasmPath = cfg.scramjetWasmPath;
    config.scramjetPath = cfg.scramjetBundlePath;
    const controller = new Controller({
        serviceworker: sw,
        transport
    });
    return controller;
}

})();

var __webpack_exports__init = __webpack_exports__.init;
var __webpack_exports__loadRest = __webpack_exports__.loadRest;
export { __webpack_exports__init as init, __webpack_exports__loadRest as loadRest };

//# sourceMappingURL=bootstrap-client.js.map