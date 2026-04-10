export function buildNodeTransform(x, y, width, height, flipX, flipY) {
    if (!flipX && !flipY) {
        return [{ translateX: x }, { translateY: y }];
    }
    return [
        { translateX: x + width / 2 },
        { translateY: y + height / 2 },
        { scaleX: flipX ? -1 : 1 },
        { scaleY: flipY ? -1 : 1 },
        { translateX: -width / 2 },
        { translateY: -height / 2 },
    ];
}
//# sourceMappingURL=nodeTransform.js.map