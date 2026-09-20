(() => {
var __webpack_modules__ = ({
"./packages/utils/src/alwaysLastBubble.ts"(__unused_rspack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  setupAlwaysLastBubble: () => (setupAlwaysLastBubble)
});
function setupAlwaysLastBubble(client, whatToCapture) {
    let currentlyExecutingDesc = null;
    const eventListeners = new Map();
    // start by recording every event registered so that we can rebuild the bubble path later
    client.Proxy("EventTarget.prototype.addEventListener", {
        apply (ctx) {
            const eventName = ctx.args[0];
            const cb = ctx.args[1];
            const options = ctx.args[2];
            const target = ctx.this;
            if (!whatToCapture.includes(eventName)) return;
            // capture events don't go through the bubble process so we shouldn't include them
            if (typeof options === "boolean" && options || typeof options === "object" && options.capture) return;
            ctx.args[1] = function(...args) {
                // will always exist since we set it just below
                const descs = eventListeners.get(target);
                // find the one talking about us
                const desc = descs.find((d)=>d.originalcb === cb);
                // have a flag for the event that's currently running so that we know where we are in the stack if preventDefault() or stopPropagation() is called
                currentlyExecutingDesc = desc;
                if (typeof cb === "function") {
                    Reflect.apply(cb, this, args);
                } else if (typeof cb === "object" && cb !== null && cb.handleEvent) {
                    Reflect.apply(cb.handleEvent, cb, args);
                }
                if (desc.injectafter) {
                    desc.injectafter(args[0]);
                    delete desc.injectafter;
                }
                currentlyExecutingDesc = null;
            };
            const desc = {
                originalcb: cb,
                type: eventName
            };
            if (eventListeners.has(target)) {
                eventListeners.get(target).push(desc);
            } else {
                eventListeners.set(target, [
                    desc
                ]);
            }
        }
    });
    return function addAlwaysLastEventListener(target, eventName, listener) {
        // this event will always run before all other ones, since it was registered at injectHistoryEmulation
        // * unless you registered the event before appending to the dom
        // * unless there's something inside of the <a> that has a listener on it
        // * unless there's a capture listener
        // TODO fix those cases
        const callListener = (e)=>{
            // this goes into our code, so restore the original methods
            // TODO: we probably shouldnt do it like this
            e.stopPropagation = client.natives.store["Event.prototype.stopPropagation"];
            e.stopImmediatePropagation = client.natives.store["Event.prototype.stopImmediatePropagation"];
            listener(e);
        };
        client.natives.call("EventTarget.prototype.addEventListener", target, eventName, (e)=>{
            let lastlistener;
            const path = e.composedPath();
            // travel the path, from the <a> all the way to Window
            for (const elm of path){
                let descriptors = eventListeners.get(elm);
                if (descriptors) {
                    descriptors = descriptors.filter((d)=>d.type === eventName);
                    // last descriptor was last added and will be called last
                    lastlistener = descriptors[descriptors.length - 1];
                }
            }
            // TODO: if a listener is added to a lower level of the dom inside the listener of a higher level, our lastlistener will not be correct
            if (!lastlistener) {
                // there are no other event listeners! great
                callListener(e);
            } else {
                // we know what the last listener is. run this to inject after it
                lastlistener.injectafter = (e)=>{
                    callListener(e);
                };
            }
            // except, if stopPropagation is called, it never gets to the lastlistener
            client.RawProxy(e, "stopImmediatePropagation", {
                apply () {
                    if (!currentlyExecutingDesc) throw new Error("stopImmediatePropagation called but no desc found?");
                    // for stopImmediatePropagation this is the last one
                    currentlyExecutingDesc.injectafter = (e)=>{
                        // in case preventDefault is called after stopImmediatePropagation(), wait for the event handler to be done
                        callListener(e);
                    };
                }
            });
            client.RawProxy(e, "stopPropagation", {
                apply (ctx) {
                    if (!currentlyExecutingDesc) throw new Error("stopPropagation called but no desc found?");
                    // stopPropagation means there might still be more listeners on the same element
                    // find whatever the last one is on the this element and then inject after it too
                    const ev = ctx.this;
                    if (!ev.target) throw new Error("no target");
                    const descs = eventListeners.get(ev.target);
                    if (!descs) throw new Error("no descs found in stopPropagation()");
                    const idx = descs.indexOf(currentlyExecutingDesc);
                    if (idx == -1) throw new Error("couldn't find currentlyExecutingDesc");
                    const remaining = descs.slice(idx + 1, descs.length);
                    if (remaining.length > 0) {
                        const last = remaining[remaining.length - 1];
                        // finally we have the last in the chain after propagation is cut off
                        last.injectafter = (e)=>{
                            callListener(e);
                        };
                    }
                }
            });
        });
    };
}


},
"./packages/utils/src/catch-escaped-links.ts"(__unused_rspack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  CatchEscapedLinksPlugin: () => (CatchEscapedLinksPlugin)
});
/* import */ var _mercuryworkshop_scramjet__rspack_import_0 = __webpack_require__("./packages/core/dist/scramjet-external.mjs");
/* import */ var _mercuryworkshop_scramjet_controller__rspack_import_1 = __webpack_require__("./packages/controller/dist/controller-external.mjs");


/**
 * Intercepts top-level navigation requests (triggered by clicking "open in new tab" on a link, or window.open)
 * Without this plugin, they would open without the proxy shell, which is usually undesired.
 * give a callback telling it how to redirect back to the proxy shell.
 */ class CatchEscapedLinksPlugin extends _mercuryworkshop_scramjet_controller__rspack_import_1.ManagedPlugin {
    toLocation;
    constructor(toLocation){
        super("catch-escaped-links", []), this.toLocation = toLocation;
    }
    install(frame) {
        this.tap(frame.hooks.fetch.intercept, (context, props)=>{
            if (context.parsed.destination !== "document") return;
            const location = this.toLocation(context.parsed.url);
            props.response = {
                body: "",
                status: 302,
                statusText: "Found",
                headers: _mercuryworkshop_scramjet__rspack_import_0.ScramjetHeaders.fromRawHeaders([
                    [
                        "Location",
                        String(location)
                    ]
                ])
            };
        }, {
            after: [
                "scramjet-http-cache"
            ]
        });
    }
}


},
"./packages/utils/src/event-handler-plugin.ts"(__unused_rspack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  EventHandlerPlugin: () => (EventHandlerPlugin),
  setupAlwaysLastBubble: () => (/* reexport safe */ _alwaysLastBubble__rspack_import_1.setupAlwaysLastBubble)
});
/* import */ var _mercuryworkshop_scramjet_controller__rspack_import_0 = __webpack_require__("./packages/controller/dist/controller-external.mjs");
/* import */ var _alwaysLastBubble__rspack_import_1 = __webpack_require__("./packages/utils/src/alwaysLastBubble.ts");



/**
 * Allows you to register an event listener on an element, such that it will only run after the page's own listeners (including after stopPropagation).
 * This allows you to fake "native" browser behavior with ease
 */ class EventHandlerPlugin extends _mercuryworkshop_scramjet_controller__rspack_import_0.ManagedPlugin {
    options;
    addAlwaysLastEventListeners = new Map();
    eventsToCapture = [];
    constructor(options = {}){
        super("event-handler", []), this.options = options;
    }
    install(frame) {
        super.install(frame);
        this.tap(frame.hooks.init.post, (context)=>{
            this.addAlwaysLastEventListeners.set(context.window, (0,_alwaysLastBubble__rspack_import_1.setupAlwaysLastBubble)(context.client, this.eventsToCapture));
        });
    }
    addEventToCapture(eventName) {
        if (this.eventsToCapture.includes(eventName)) return;
        this.eventsToCapture.push(eventName);
    }
    getWindow(target) {
        if (!target) return null;
        // TODO: object safety
        // @ts-expect-error
        if ("ownerDocument" in target && target.ownerDocument.defaultView) {
            // @ts-expect-error
            return target.ownerDocument.defaultView;
        }
        if ("constructor" in target && target.constructor && "constructor" in target.constructor && target.constructor.constructor) {
            // @ts-expect-error hack hack hack sahur
            return new target.constructor.constructor("return globalThis")();
        }
        return null;
    }
    addEventListener(target, eventName, listener) {
        const window = this.getWindow(target);
        if (!window) {
            console.warn("target's original realm could not be found", target);
            return;
        }
        const addAlwaysLastEventListener = this.addAlwaysLastEventListeners.get(window);
        if (!addAlwaysLastEventListener) {
            throw new Error("somehow the realm of the target never had addAlwaysLastEventListener installed");
        }
        addAlwaysLastEventListener(target, eventName, listener);
    }
}


},
"./packages/utils/src/http-cache-plugin.ts"(__unused_rspack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  CACHE_NAME: () => (CACHE_NAME),
  HttpCachePlugin: () => (HttpCachePlugin)
});
/* import */ var _mercuryworkshop_scramjet__rspack_import_0 = __webpack_require__("./packages/core/dist/scramjet-external.mjs");
/* import */ var _mercuryworkshop_scramjet_controller__rspack_import_1 = __webpack_require__("./packages/controller/dist/controller-external.mjs");
// HTTP cache plugin for ScramjetFetchHandler.
//
// Service-worker `fetch` ignores the browser's HTTP cache, so without this
// every navigation re-runs the full network fetch even for unchanged
// resources. This plugin caches the **upstream** response (the BareResponse
// as received from the network, BEFORE rewriteResponseHeaders / rewriteBody
// run). On a hit we hand that same untouched response to the pipeline, which
// then re-rewrites with the current Frame's prefix.
//
// Storing pre-rewrite means:
//   - The cache is shared across Frames, Controllers, and page reloads --
//     one Frame's hit serves another Frame's request because the stored
//     bytes contain only the upstream's URLs, not any frame-bound prefix.
//   - Redirect Location / Content-Location and Link headers come out of
//     `rewriteResponseHeaders` correctly on each hit, because that runs
//     on the cache-derived response just like a fresh one.
//   - We don't skip the rewriter on hit; we only skip the network. That's
//     where the win actually is for service-worker proxying.
//
// Implementation aims for RFC 9111 (HTTP caching) compliance for a
// PRIVATE cache (browser-local, single-user):
//
//   - Only GET / HEAD are cached.
//   - Cacheable status codes per RFC 9110 §15.1: 200 203 204 300 301 308
//     404 405 410 414 501. Other statuses pass through. 206 is omitted
//     because the Cache API spec (Service Workers §cache-put) rejects
//     partial responses outright.
//   - `Cache-Control: no-store` and `Vary: *` opt out.
//   - Freshness:
//       1. `Cache-Control: s-maxage` (private cache treats this same as
//          max-age),
//       2. `Cache-Control: max-age`,
//       3. `Expires`,
//       4. heuristic 10% × (Date - Last-Modified) per RFC 9111 §4.2.2.
//   - `Cache-Control: no-cache` / `Pragma: no-cache` / `Cache-Control:
//     immutable` are honoured.
//   - `Vary` is honoured by storing one entry per (URL × selected-headers)
//     pair via the underlying Cache API's built-in matching.
//
// 304 revalidation isn't handled here yet -- stale entries fall through to
// a full refetch. Adding it cleanly requires a hook position that lets us
// substitute the cached body AFTER the network 304 arrives but BEFORE
// `rewriteBody` runs, without going through `rewriteBody` again. That can
// come later.


const CACHE_NAME = "scramjet-http-cache-v2";
/** Header recording when this entry entered the cache (ms since epoch). */ const STORED_AT_HEADER = "x-sj-cached-at";
/**
 * Status codes RFC 9110 §15.1 marks as "cacheable by default", minus 206:
 * the Cache API rejects partial responses (cache.put throws TypeError on
 * any non-200/non-OK response with a Content-Range), so storing them is a
 * non-starter regardless of what HTTP allows.
 */ const DEFAULT_CACHEABLE_STATUSES = new Set([
    200,
    203,
    204,
    300,
    301,
    308,
    404,
    405,
    410,
    414,
    501
]);
/**
 * Statuses for which the Fetch spec forbids a body. The Response constructor
 * throws TypeError if you pair any of these with a body -- even an empty
 * string or 0-byte buffer.
 */ const NULL_BODY_STATUSES = new Set([
    101,
    103,
    204,
    205,
    304
]);
function parseCacheControl(value) {
    const out = {};
    if (!value) return out;
    for (const raw of value.split(",")){
        const part = raw.trim();
        if (!part) continue;
        const eq = part.indexOf("=");
        const name = (eq === -1 ? part : part.slice(0, eq)).trim().toLowerCase();
        if (eq === -1) {
            out[name] = true;
            continue;
        }
        let v = part.slice(eq + 1).trim();
        if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
        if (name === "max-age" || name === "s-maxage" || name === "stale-while-revalidate" || name === "stale-if-error") {
            const n = parseInt(v, 10);
            if (Number.isFinite(n) && n >= 0) out[name] = n;
        } else {
            out[name] = true;
        }
    }
    return out;
}
/**
 * RFC 9111 §4.2.1 freshness lifetime calculation, simplified for a private
 * cache (so s-maxage is treated identically to max-age).
 */ function freshnessLifetimeSeconds(headers, cc, dateMs) {
    if (cc["s-maxage"] !== undefined) return cc["s-maxage"];
    if (cc["max-age"] !== undefined) return cc["max-age"];
    const expires = headers.get("expires");
    if (expires) {
        const expMs = Date.parse(expires);
        if (Number.isFinite(expMs)) {
            return Math.max(0, (expMs - dateMs) / 1000);
        }
    }
    const lastModified = headers.get("last-modified");
    if (lastModified) {
        const lmMs = Date.parse(lastModified);
        if (Number.isFinite(lmMs) && lmMs <= dateMs) {
            // RFC 9111 §4.2.2 heuristic: 10% of the time since Last-Modified.
            return (dateMs - lmMs) * 0.1 / 1000;
        }
    }
    return null;
}
/** Current age (seconds) of a stored response per RFC 9111 §4.2.3. */ function currentAgeSeconds(headers, storedAtMs) {
    const ageHeader = headers.get("age");
    const initialAge = ageHeader ? parseInt(ageHeader, 10) || 0 : 0;
    const residentTime = (Date.now() - storedAtMs) / 1000;
    return initialAge + residentTime;
}
function isCacheableMethod(method) {
    return method === "GET" || method === "HEAD";
}
/**
 * Whether a response (status + Cache-Control + Vary) is allowed to be stored.
 * RFC 9110 §15.1 + RFC 9111 §3. `headers` is the upstream's raw response
 * headers, not yet through scramjet's response-header rewriter.
 */ function responseIsStorable(status, headers, method) {
    if (!isCacheableMethod(method)) return false;
    if (!DEFAULT_CACHEABLE_STATUSES.has(status)) return false;
    const cc = parseCacheControl(headers.get("cache-control"));
    if (cc["no-store"]) return false;
    // "Vary: *" means "never reusable".
    const vary = headers.get("vary");
    if (vary && vary.split(",").some((v)=>v.trim() === "*")) return false;
    return true;
}
/** Build a synthetic cache-key Request keyed by the *underlying* URL. */ function buildCacheKeyRequest(parsedUrl, headers) {
    const native = new Headers();
    for (const [k, v] of headers.toRawHeaders()){
        try {
            native.append(k, v);
        } catch  {}
    }
    const cacheKeyUrl = "https://sj-cache.invalid/" + encodeURIComponent(parsedUrl);
    return new Request(cacheKeyUrl, {
        method: "GET",
        headers: native
    });
}
/** Rebuild a Headers object from the BareResponse's rawHeaders array. */ function nativeHeadersFromRaw(raw) {
    const h = new Headers();
    for (const [k, v] of raw){
        try {
            h.append(k, v);
        } catch  {
        // some upstream headers (e.g. malformed Set-Cookie) are rejected
        // by the native Headers; just drop them.
        }
    }
    return h;
}
/** Strip our internal bookkeeping from a stored Response's headers. */ function strippedHeadersFromStored(stored) {
    const out = new Headers();
    for (const [k, v] of stored.headers.entries()){
        if (k.toLowerCase() === STORED_AT_HEADER) continue;
        try {
            out.append(k, v);
        } catch  {}
    }
    return out;
}
/**
 * Turn an upstream BareResponse into a BareResponse that:
 *   - has the same headers/status/statusText
 *   - has its body replaced with a buffered ArrayBuffer (so the pipeline can
 *     read it again after we've consumed the original stream for the cache)
 * Returns the buffered bytes too so the caller can hand them off elsewhere.
 */ async function rebuildBareResponseWithBuffer(bare) {
    const status = bare.status;
    const isNullBody = NULL_BODY_STATUSES.has(status);
    const headers = nativeHeadersFromRaw(bare.rawHeaders);
    if (isNullBody) {
        return {
            replacement: _mercuryworkshop_scramjet__rspack_import_0.BareResponse.fromNativeResponse(new Response(null, {
                status,
                statusText: bare.statusText,
                headers
            })),
            bodyBuffer: null
        };
    }
    const buf = await bare.arrayBuffer();
    return {
        replacement: _mercuryworkshop_scramjet__rspack_import_0.BareResponse.fromNativeResponse(new Response(buf, {
            status,
            statusText: bare.statusText,
            headers
        })),
        bodyBuffer: buf
    };
}
/**
 * Build a `Response` to put in the Cache API. Tags it with our internal
 * STORED_AT_HEADER so freshness can be computed on later lookups.
 */ function buildStorableResponse(body, status, statusText, rawHeaders) {
    const native = nativeHeadersFromRaw(rawHeaders);
    native.set(STORED_AT_HEADER, String(Date.now()));
    return new Response(NULL_BODY_STATUSES.has(status) ? null : body, {
        status,
        statusText,
        headers: native
    });
}
/**
 * RFC-9111-ish HTTP cache for ScramjetFetchHandler.
 *
 * One instance can be installed onto multiple Frames -- the WeakMap of
 * "did this request come from cache?" book-keeping is per-instance, not
 * per-Frame, so nothing leaks across installs.
 */ class HttpCachePlugin extends _mercuryworkshop_scramjet_controller__rspack_import_1.ManagedPlugin {
    cacheName;
    cachePromise = null;
    // Marks requests whose `earlyResponse` we sourced from the cache, so the
    // preresponse hook below knows not to re-store them. WeakMap keys are
    // the request objects so entries clean themselves up automatically.
    cameFromCache = new WeakMap();
    constructor(options = {}){
        super("scramjet-http-cache", []);
        this.cacheName = options.cacheName ?? CACHE_NAME;
    }
    /** Lazy-open the underlying Cache. Memoized for the plugin's lifetime. */ openCache() {
        if (!this.cachePromise) {
            this.cachePromise = caches.open(this.cacheName);
        }
        return this.cachePromise;
    }
    install(frame) {
        super.install(frame);
        const hooks = frame.fetchHandler.hooks.fetch;
        // ----- request: cache lookup --------------------------------------
        this.tap(hooks.request, async (ctx, props)=>{
            const req = ctx.request;
            if (!isCacheableMethod(req.method)) return;
            const reqCache = req.cache;
            // Honour the request's own cache mode where it asks for fresh data.
            if (reqCache === "no-store" || reqCache === "reload") return;
            // Don't undo an earlyResponse another plugin already set.
            if (props.earlyResponse) return;
            const cache = await this.openCache();
            const stored = await cache.match(buildCacheKeyRequest(ctx.parsed.url.href, req.initialHeaders));
            if (!stored) {
                return;
            }
            const storedAt = parseInt(stored.headers.get(STORED_AT_HEADER) ?? "0", 10);
            const cc = parseCacheControl(stored.headers.get("cache-control"));
            const pragmaNoCache = (stored.headers.get("pragma") ?? "").toLowerCase().includes("no-cache");
            const mustRevalidateBeforeUse = cc["no-cache"] === true || pragmaNoCache || reqCache === "no-cache";
            const dateMs = (()=>{
                const d = stored.headers.get("date");
                if (d) {
                    const v = Date.parse(d);
                    if (Number.isFinite(v)) return v;
                }
                return storedAt || Date.now();
            })();
            const lifetime = freshnessLifetimeSeconds(stored.headers, cc, dateMs);
            const age = currentAgeSeconds(stored.headers, storedAt);
            const fresh = !mustRevalidateBeforeUse && lifetime !== null && age < lifetime;
            // `immutable` short-circuits the freshness check (RFC 8246)
            // provided the client hasn't asked for a forced revalidation.
            const immutable = cc.immutable === true && reqCache !== "no-cache" && reqCache !== "reload";
            if (!fresh && !immutable) {
                // Stale; fall through to the network. (TODO: 304 revalidation.)
                return;
            }
            // Build a BareResponse around the stored bytes/headers and hand
            // it to doNetworkFetch via earlyResponse. The pipeline will then
            // run rewriteResponseHeaders/rewriteBody/etc. as if we'd just
            // fetched it.
            const headers = strippedHeadersFromStored(stored);
            // Recompute Age the consumer sees so it isn't stuck at storage
            // time.
            if (storedAt) {
                headers.set("age", String(Math.floor((Date.now() - storedAt) / 1000)));
            }
            const isNullBody = NULL_BODY_STATUSES.has(stored.status);
            const earlyBody = isNullBody ? null : await stored.arrayBuffer();
            const earlyResponse = _mercuryworkshop_scramjet__rspack_import_0.BareResponse.fromNativeResponse(new Response(earlyBody, {
                status: stored.status,
                statusText: stored.statusText,
                headers
            }));
            this.cameFromCache.set(req, true);
            props.earlyResponse = earlyResponse;
        });
        // ----- preresponse: cache store -----------------------------------
        this.tap(hooks.preresponse, async (ctx, props)=>{
            const req = ctx.request;
            // Skip if this body came back via cache.match -- restoring it
            // would just rewrite the same bytes with a fresh STORED_AT_HEADER
            // (resetting the freshness clock).
            if (this.cameFromCache.has(req)) {
                this.cameFromCache.delete(req);
                return;
            }
            if (req.cache === "no-store") return;
            if (!isCacheableMethod(req.method)) return;
            const headers = nativeHeadersFromRaw(props.response.rawHeaders);
            if (!responseIsStorable(props.response.status, headers, req.method)) return;
            // Drain the stream once and rebuild the BareResponse around the
            // buffered copy so the rest of doHandleFetch can still read it.
            const { replacement, bodyBuffer } = await rebuildBareResponseWithBuffer(props.response);
            props.response = replacement;
            const cacheKey = buildCacheKeyRequest(ctx.parsed.url.href, req.initialHeaders);
            const toStore = buildStorableResponse(bodyBuffer, props.response.status, props.response.statusText, props.response.rawHeaders);
            try {
                const cache = await this.openCache();
                await cache.put(cacheKey, toStore);
            } catch (err) {
                // Cache.put can fail on opaque or oddly-headered responses;
                // don't let a cache write failure break the actual fetch.
                console.warn("[scramjet-http-cache] cache.put failed:", err);
            }
        });
    }
    /**
	 * Drop every entry in the HTTP cache. Returns whether the underlying
	 * Cache existed and was deleted.
	 */ async bust() {
        try {
            // Drop the memoized handle too; the next install will re-open
            // against a fresh empty cache.
            this.cachePromise = null;
            return await caches.delete(this.cacheName);
        } catch (err) {
            console.error("[scramjet-http-cache] bust failed:", err);
            return false;
        }
    }
}


},
"./packages/utils/src/link-handler-plugin.ts"(__unused_rspack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  LinkHandlerPlugin: () => (LinkHandlerPlugin)
});
/* import */ var _mercuryworkshop_scramjet_controller__rspack_import_0 = __webpack_require__("./packages/controller/dist/controller-external.mjs");

/**
 * Intercepts anchor clicks and middle-clicks so they open in a new tab via a
 * callback instead of the browser default. Requires {@link EventHandlerPlugin}
 * on the same frame.
 */ class LinkHandlerPlugin extends _mercuryworkshop_scramjet_controller__rspack_import_0.ManagedPlugin {
    onNewTab;
    options;
    constructor(onNewTab, options = {}){
        super("link-handler", [
            "event-handler"
        ]), this.onNewTab = onNewTab, this.options = options;
    }
    install(frame) {
        this.tap(frame.hooks.init.post, (_context)=>{
            const eventHandler = frame.plugins.find((p)=>p.name === "event-handler");
            const attachAnchorListeners = (node)=>{
                const openInNewTab = ()=>{
                    this.onNewTab(node.href);
                };
                eventHandler.addEventListener(node, "click", (e)=>{
                    if (e.button !== 0) return;
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    openInNewTab();
                });
                eventHandler.addEventListener(node, "auxclick", (e)=>{
                    if (e.button !== 1) return;
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    openInNewTab();
                });
            };
            const anchorObserver = new MutationObserver((mutations)=>{
                mutations.forEach((mutation)=>{
                    // https://issues.chromium.org/issues/440360422
                    setTimeout(()=>{
                        mutation.addedNodes.forEach((_node)=>{
                            const node = _node;
                            if ("tagName" in node && node.tagName == "A") {
                                attachAnchorListeners(node);
                            }
                        });
                    }, 2000);
                });
            });
            anchorObserver.observe(window.document, {
                childList: true,
                subtree: true
            });
            window.addEventListener("load", ()=>{
                window.document.querySelectorAll("*").forEach((e)=>e);
            });
        }, {
            after: [
                "event-handler"
            ]
        });
    }
}


},
"./packages/utils/src/url-watcher.ts"(__unused_rspack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  UrlWatcherPlugin: () => (UrlWatcherPlugin)
});
/* import */ var _mercuryworkshop_scramjet_controller__rspack_import_0 = __webpack_require__("./packages/controller/dist/controller-external.mjs");

/**
 * Runs a callback whenever the URL of a Frame changes.
 * Includes hash changes and history.pushState/replaceState.
 * For only true navigation events, use the Frame.hooks.init.post hook.
 */ class UrlWatcherPlugin extends _mercuryworkshop_scramjet_controller__rspack_import_0.ManagedPlugin {
    onUrlChange;
    options;
    constructor(onUrlChange, options = {}){
        super("url-watcher", []), this.onUrlChange = onUrlChange, this.options = options;
    }
    install(frame) {
        this.tap(frame.hooks.init.post, (context)=>{
            if (!context.isTopLevel) return;
            const notify = ()=>{
                this.onUrlChange(context.client.url.href);
            };
            notify();
            this.tap(context.client.hooks.lifecycle.navigate, (_context, props)=>{
                this.onUrlChange(props.url);
            });
            // TODO: this will probably make it fire twice if it was triggered by location.hash
            context.window.addEventListener("hashchange", notify, {
                capture: true
            });
        });
    }
}


},
"./packages/utils/src/version.ts"(__unused_rspack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  assertDependencyVersions: () => (assertDependencyVersions)
});
function assertVersionMatch(packageName, expected, actual) {
    if (expected !== actual) {
        throw new Error(`${packageName} version mismatch: this build expects ${expected}, but the loaded runtime is ${actual}`);
    }
}
function assertDependencyVersions() {
    if (typeof $scramjet === "undefined") {
        console.error("@mercuryworkshop/scramjet is not loaded. Load scramjet before scramjet-utils.");
    }
    assertVersionMatch("@mercuryworkshop/scramjet", "2.0.67-alpha.2", $scramjet.versionInfo.version);
    if (typeof $scramjetController === "undefined") {
        console.error("@mercuryworkshop/scramjet-controller is not loaded. Load the controller before scramjet-utils.");
    }
    assertVersionMatch("@mercuryworkshop/scramjet-controller", "0.0.14", $scramjetController.VERSION);
}


},
"./packages/controller/dist/controller-external.mjs"(__unused_rspack___webpack_module__, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  Controller: () => (Controller),
  Frame: () => (Frame),
  ManagedPlugin: () => (ManagedPlugin),
  VERSION: () => (VERSION),
  assertRuntimeScramjetVersion: () => (assertRuntimeScramjetVersion),
  config: () => (config)
});
// AUTO-GENERATED by ExternalStubPlugin — do not edit.
// Re-exports of globalThis.$scramjetController (set by the IIFE bundle).
const __external = /** @type {any} */ (globalThis).$scramjetController;
const {
	Controller,
	Frame,
	ManagedPlugin,
	VERSION,
	assertRuntimeScramjetVersion,
	config,
} = __external;


},
"./packages/core/dist/scramjet-external.mjs"(__unused_rspack___webpack_module__, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  BareResponse: () => (BareResponse),
  CookieJar: () => (CookieJar),
  IncrementalHtmlRewriter: () => (IncrementalHtmlRewriter),
  Plugin: () => (Plugin),
  SCRAMJETCLIENT: () => (SCRAMJETCLIENT),
  SCRAMJETCLIENTNAME: () => (SCRAMJETCLIENTNAME),
  ScramjetClient: () => (ScramjetClient),
  ScramjetFetchHandler: () => (ScramjetFetchHandler),
  ScramjetFetchTrackedClient: () => (ScramjetFetchTrackedClient),
  ScramjetHeaders: () => (ScramjetHeaders),
  Tap: () => (Tap),
  createLocationProxy: () => (createLocationProxy),
  defaultConfig: () => (defaultConfig),
  defaultConfigDev: () => (defaultConfigDev),
  flagEnabled: () => (flagEnabled),
  getOwnPropertyDescriptorHandler: () => (getOwnPropertyDescriptorHandler),
  getRewriter: () => (getRewriter),
  getScriptBlockTypeString: () => (getScriptBlockTypeString),
  htmlRules: () => (htmlRules),
  isArchiveMimeType: () => (isArchiveMimeType),
  isAudioOrVideoMimeType: () => (isAudioOrVideoMimeType),
  isFontMimeType: () => (isFontMimeType),
  isHtmlMimeType: () => (isHtmlMimeType),
  isImageMimeType: () => (isImageMimeType),
  isInlineDisplayableMimeType: () => (isInlineDisplayableMimeType),
  isJavascriptMimeType: () => (isJavascriptMimeType),
  isJavascriptMimeTypeEssenceMatch: () => (isJavascriptMimeTypeEssenceMatch),
  isModuleScriptType: () => (isModuleScriptType),
  isScriptType: () => (isScriptType),
  isScriptableMimeType: () => (isScriptableMimeType),
  isXmlMimeType: () => (isXmlMimeType),
  isZipBasedMimeType: () => (isZipBasedMimeType),
  isdedicated: () => (isdedicated),
  isshared: () => (isshared),
  issw: () => (issw),
  iswindow: () => (iswindow),
  isworker: () => (isworker),
  parseMimeType: () => (parseMimeType),
  rewriteBlob: () => (rewriteBlob),
  rewriteCss: () => (rewriteCss),
  rewriteHtml: () => (rewriteHtml),
  rewriteJs: () => (rewriteJs),
  rewriteJsInner: () => (rewriteJsInner),
  rewriteSrcset: () => (rewriteSrcset),
  rewriteUrl: () => (rewriteUrl),
  rewriteWorkers: () => (rewriteWorkers),
  setWasm: () => (setWasm),
  unrewriteBlob: () => (unrewriteBlob),
  unrewriteCss: () => (unrewriteCss),
  unrewriteHtml: () => (unrewriteHtml),
  unrewriteUrl: () => (unrewriteUrl),
  versionInfo: () => (versionInfo)
});
// AUTO-GENERATED by ExternalStubPlugin — do not edit.
// Re-exports of globalThis.$scramjet (set by the IIFE bundle).
const __external = /** @type {any} */ (globalThis).$scramjet;
const {
	BareResponse,
	CookieJar,
	IncrementalHtmlRewriter,
	Plugin,
	SCRAMJETCLIENT,
	SCRAMJETCLIENTNAME,
	ScramjetClient,
	ScramjetFetchHandler,
	ScramjetFetchTrackedClient,
	ScramjetHeaders,
	Tap,
	createLocationProxy,
	defaultConfig,
	defaultConfigDev,
	flagEnabled,
	getOwnPropertyDescriptorHandler,
	getRewriter,
	getScriptBlockTypeString,
	htmlRules,
	isArchiveMimeType,
	isAudioOrVideoMimeType,
	isFontMimeType,
	isHtmlMimeType,
	isImageMimeType,
	isInlineDisplayableMimeType,
	isJavascriptMimeType,
	isJavascriptMimeTypeEssenceMatch,
	isModuleScriptType,
	isScriptType,
	isScriptableMimeType,
	isXmlMimeType,
	isZipBasedMimeType,
	isdedicated,
	isshared,
	issw,
	iswindow,
	isworker,
	parseMimeType,
	rewriteBlob,
	rewriteCss,
	rewriteHtml,
	rewriteJs,
	rewriteJsInner,
	rewriteSrcset,
	rewriteUrl,
	rewriteWorkers,
	setWasm,
	unrewriteBlob,
	unrewriteCss,
	unrewriteHtml,
	unrewriteUrl,
	versionInfo,
} = __external;


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
  CACHE_NAME: () => (/* reexport safe */ _http_cache_plugin__rspack_import_3.CACHE_NAME),
  CatchEscapedLinksPlugin: () => (/* reexport safe */ _catch_escaped_links__rspack_import_5.CatchEscapedLinksPlugin),
  EventHandlerPlugin: () => (/* reexport safe */ _event_handler_plugin__rspack_import_7.EventHandlerPlugin),
  HttpCachePlugin: () => (/* reexport safe */ _http_cache_plugin__rspack_import_3.HttpCachePlugin),
  LinkHandlerPlugin: () => (/* reexport safe */ _link_handler_plugin__rspack_import_8.LinkHandlerPlugin),
  ManagedPlugin: () => (/* reexport safe */ _mercuryworkshop_scramjet_controller__rspack_import_2.ManagedPlugin),
  UrlWatcherPlugin: () => (/* reexport safe */ _url_watcher__rspack_import_4.UrlWatcherPlugin),
  setupAlwaysLastBubble: () => (/* reexport safe */ _alwaysLastBubble__rspack_import_6.setupAlwaysLastBubble),
  versionInfo: () => (/* reexport safe */ _mercuryworkshop_scramjet__rspack_import_0.versionInfo)
});
/* import */ var _mercuryworkshop_scramjet__rspack_import_0 = __webpack_require__("./packages/core/dist/scramjet-external.mjs");
/* import */ var _version__rspack_import_1 = __webpack_require__("./packages/utils/src/version.ts");
/* import */ var _mercuryworkshop_scramjet_controller__rspack_import_2 = __webpack_require__("./packages/controller/dist/controller-external.mjs");
/* import */ var _http_cache_plugin__rspack_import_3 = __webpack_require__("./packages/utils/src/http-cache-plugin.ts");
/* import */ var _url_watcher__rspack_import_4 = __webpack_require__("./packages/utils/src/url-watcher.ts");
/* import */ var _catch_escaped_links__rspack_import_5 = __webpack_require__("./packages/utils/src/catch-escaped-links.ts");
/* import */ var _alwaysLastBubble__rspack_import_6 = __webpack_require__("./packages/utils/src/alwaysLastBubble.ts");
/* import */ var _event_handler_plugin__rspack_import_7 = __webpack_require__("./packages/utils/src/event-handler-plugin.ts");
/* import */ var _link_handler_plugin__rspack_import_8 = __webpack_require__("./packages/utils/src/link-handler-plugin.ts");










(0,_version__rspack_import_1.assertDependencyVersions)();

})();

self.$scramjetUtils = __webpack_exports__;
})()
;
//# sourceMappingURL=scramjet-utils.js.map