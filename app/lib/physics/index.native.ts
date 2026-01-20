import { initPhysics as initNative } from "./Physics.native";
import { Box2DAPI } from "./types";

export const initPhysics = async (): Promise<Box2DAPI> => {
  return initNative();
};

export * from "./types";
