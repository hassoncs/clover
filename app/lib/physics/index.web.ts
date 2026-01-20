import { initPhysics as initWeb } from "./Physics.web";
import { Box2DAPI } from "./types";

export const initPhysics = async (): Promise<Box2DAPI> => {
  return initWeb();
};

export * from "./types";
