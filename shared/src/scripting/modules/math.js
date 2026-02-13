function add(a, b) {
	return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a, b) {
	return { x: a.x - b.x, y: a.y - b.y };
}

function scale(v, s) {
	return { x: v.x * s, y: v.y * s };
}

function length(v) {
	return Math.sqrt(v.x * v.x + v.y * v.y);
}

function normalize(v) {
	var len = length(v);
	if (len === 0) return { x: 0, y: 0 };
	return { x: v.x / len, y: v.y / len };
}

function distance(a, b) {
	var dx = b.x - a.x;
	var dy = b.y - a.y;
	return Math.sqrt(dx * dx + dy * dy);
}

function dot(a, b) {
	return a.x * b.x + a.y * b.y;
}

function lerp(a, b, t) {
	return {
		x: a.x + (b.x - a.x) * t,
		y: a.y + (b.y - a.y) * t,
	};
}

function clamp(val, min, max) {
	if (val < min) return min;
	if (val > max) return max;
	return val;
}

function remap(val, inMin, inMax, outMin, outMax) {
	var t = (val - inMin) / (inMax - inMin);
	return outMin + t * (outMax - outMin);
}

function randomRange(min, max) {
	return min + Math.random() * (max - min);
}

function randomInCircle(radius) {
	var angle = Math.random() * Math.PI * 2;
	var r = Math.sqrt(Math.random()) * radius;
	return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
}

function angle(v) {
	return Math.atan2(v.y, v.x);
}

function fromAngle(radians, len) {
	var l = len !== undefined ? len : 1;
	return { x: Math.cos(radians) * l, y: Math.sin(radians) * l };
}

module.exports = {
	add: add,
	sub: sub,
	scale: scale,
	length: length,
	normalize: normalize,
	distance: distance,
	dot: dot,
	lerp: lerp,
	clamp: clamp,
	remap: remap,
	randomRange: randomRange,
	randomInCircle: randomInCircle,
	angle: angle,
	fromAngle: fromAngle,
};
