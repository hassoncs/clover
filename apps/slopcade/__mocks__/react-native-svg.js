import React from "react";

const createSvgComponent = (name) => {
	const Component = ({ children, ...props }) =>
		React.createElement(name.toLowerCase(), props, children);
	Component.displayName = name;
	return Component;
};

export const Svg = createSvgComponent("svg");
export const Circle = createSvgComponent("circle");
export const Ellipse = createSvgComponent("ellipse");
export const G = createSvgComponent("g");
export const Text = createSvgComponent("text");
export const TSpan = createSvgComponent("tspan");
export const TextPath = createSvgComponent("textpath");
export const Path = createSvgComponent("path");
export const Polygon = createSvgComponent("polygon");
export const Polyline = createSvgComponent("polyline");
export const Line = createSvgComponent("line");
export const Rect = createSvgComponent("rect");
export const Use = createSvgComponent("use");
export const Image = createSvgComponent("image");
export const Symbol = createSvgComponent("symbol");
export const Defs = createSvgComponent("defs");
export const LinearGradient = createSvgComponent("lineargradient");
export const RadialGradient = createSvgComponent("radialgradient");
export const Stop = createSvgComponent("stop");
export const ClipPath = createSvgComponent("clippath");
export const Pattern = createSvgComponent("pattern");
export const Mask = createSvgComponent("mask");
export const ForeignObject = createSvgComponent("foreignobject");
export const Marker = createSvgComponent("marker");

export default Svg;
