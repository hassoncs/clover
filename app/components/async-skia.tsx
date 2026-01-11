// Helper to ensure Skia loads or throws inside of React Suspense on web.
import React from "react";


import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

import * as Skia from "@shopify/react-native-skia";
console.log("🚀 ~ Skia:", Skia);


function wrapPromise<T>(promise: Promise<T>) {
  let status: "pending" | "success" | "error" = "pending";
  let result: T | unknown;
  let suspender = promise.then(
    (r: T) => {
      status = "success";
      result = r;
    },
    (e: unknown) => {
      status = "error";
      result = e;
    }
  );
  return {
    read(): T {
      if (status === "pending") {
        throw suspender;
      } else if (status === "error") {
        throw result;
      } else if (status === "success") {
        return result as T;
      }
      throw new Error("Unexpected state");
    },
  };
}

const promiseMap = new Map();

const getSuspendingPromise = () => {
  const id = "skia";
  if (!promiseMap.has(id)) {
    const loadPromise = LoadSkiaWeb().then((skia) => {
      // Ensure CanvasKit is available on all global scopes for lazy-loaded bundles
      if (typeof global !== "undefined" && global.CanvasKit) {
        if (typeof globalThis !== "undefined") {
          globalThis.CanvasKit = global.CanvasKit;
        }
        if (typeof window !== "undefined") {
          window.CanvasKit = global.CanvasKit;
        }
        console.log("[AsyncSkia] CanvasKit set on all global scopes");
      }
      return skia;
    });
    const loader = wrapPromise(loadPromise);
    promiseMap.set(id, loader);
    return loader.read();
  }

  return promiseMap.get(id).read();
};

const getResolvedPromise = React.cache(getSuspendingPromise);

export function AsyncSkia({}) {
  getResolvedPromise();
  return null;
}
