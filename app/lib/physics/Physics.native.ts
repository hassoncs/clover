import { Box2d } from "react-native-box2d";
import { Box2DAPI } from "./types";

export const initPhysics = async (): Promise<Box2DAPI> => {
  return Box2d as Box2DAPI;
};
