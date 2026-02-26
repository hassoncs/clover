import React from "react";

export const Gesture = {
	Tap: () => ({ onStart: () => Gesture.Tap(), onEnd: () => Gesture.Tap(), runOnJS: () => Gesture.Tap() }),
	Pan: () => ({ onUpdate: () => Gesture.Pan(), onEnd: () => Gesture.Pan(), runOnJS: () => Gesture.Pan() }),
	Simultaneous: (...handlers) => handlers[0],
	Exclusive: (...handlers) => handlers[0],
	Race: (...handlers) => handlers[0],
};

export const GestureDetector = ({ children }) => children;
export const GestureHandlerRootView = ({ children, style }) =>
	React.createElement("div", { style }, children);

export default { Gesture, GestureDetector, GestureHandlerRootView };
