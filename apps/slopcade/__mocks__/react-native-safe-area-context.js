import React from "react";

export const SafeAreaProvider = ({ children }) => React.createElement(React.Fragment, null, children);
export const SafeAreaView = ({ children, style, ...props }) => React.createElement("div", { style, ...props }, children);
export const useSafeAreaInsets = () => ({ top: 0, right: 0, bottom: 0, left: 0 });
export const useSafeAreaFrame = () => ({ x: 0, y: 0, width: 375, height: 812 });
export const SafeAreaInsetsContext = React.createContext({ top: 0, right: 0, bottom: 0, left: 0 });
export const SafeAreaFrameContext = React.createContext({ x: 0, y: 0, width: 375, height: 812 });
export const initialWindowMetrics = { insets: { top: 0, right: 0, bottom: 0, left: 0 }, frame: { x: 0, y: 0, width: 375, height: 812 } };
