// Replacement for @shopify/react-native-skia/lib/module/skia/Skia.web.js
//
// The real module runs: export const Skia = JsiSkApi(global.CanvasKit)
// at module load time, before CanvasKit is available.
//
// This stub creates a deep lazy proxy chain.
// Module-level code like `Skia.Typeface.MakeFreeTypeFaceFromData.bind(...)` will
// get a "deferred function" that lazily calls the real function at invocation time.
//
// Strategy: every property access on a not-yet-initialized Skia returns another
// deep proxy. When a deferred proxy is CALLED, it calls the real path on the real Skia.

import { JsiSkApi } from "@shopify/react-native-skia/lib/module/skia/web/JsiSkia.js";

let _skia = null;

function getRealSkia() {
	if (_skia) return _skia;
	const ck = globalThis.CanvasKit;
	if (!ck) return null;
	_skia = JsiSkApi(ck);
	console.log("[skia-web stub] Skia initialized with CanvasKit", typeof ck);
	return _skia;
}

function deepProxy(path) {
	return new Proxy(function deferred() {}, {
		get(_t, prop) {
			if (typeof prop === "symbol") return undefined;
			const s = getRealSkia();
			if (s) {
				let val = s;
				for (const part of path) val = val?.[part];
				return val?.[prop];
			}
			return deepProxy([...path, prop]);
		},
		apply(_t, thisArg, args) {
			const s = getRealSkia();
			if (!s) {
				console.warn("[skia-web stub] CanvasKit not yet loaded, deferred call for path:", path.join("."));
				return undefined;
			}
			let fn = s;
			let parent = s;
			for (const part of path) {
				parent = fn;
				fn = fn?.[part];
			}
			if (typeof fn !== "function") return undefined;
			return fn.apply(parent, args);
		},
		set(_t, prop, value) {
			const s = getRealSkia();
			if (s) {
				let val = s;
				for (const part of path) val = val?.[part];
				if (val) val[prop] = value;
			}
			return true;
		},
	});
}

export const Skia = new Proxy(
	{},
	{
		get(_t, prop) {
			if (typeof prop === "symbol") return undefined;
			const s = getRealSkia();
			if (s) return s[prop];
			return deepProxy([prop]);
		},
		set(_t, prop, value) {
			const s = getRealSkia();
			if (s) s[prop] = value;
			return true;
		},
		has(_t, prop) {
			const s = getRealSkia();
			return s ? prop in s : false;
		},
	},
);
