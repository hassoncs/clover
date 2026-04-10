import { parsePadding, parseSizing } from "./layout-core";
export { parsePadding, parseSizing } from "./layout-core";
// On native, layout is always synchronously available (no WASM loading needed).
// This no-op implementation keeps parity with layout.web.ts's subscribeLayoutReady.
export function subscribeLayoutReady(fn) {
    fn();
    return () => { };
}
function isContainer(node) {
    return node.type === "frame" || node.type === "group";
}
/**
 * Infer the effective layout direction for a container node.
 * In .pen files, having justifyContent/alignItems/gap implies flex layout even
 * when "layout" isn't explicitly set. Defaults to "horizontal" (CSS row) in
 * that case, matching standard flexbox behavior.
 */
function inferLayout(container) {
    const explicit = container.layout ?? "none";
    if (explicit !== "none")
        return explicit;
    const frame = container;
    if (frame.justifyContent ||
        frame.alignItems ||
        (container.gap && container.gap > 0)) {
        return "horizontal";
    }
    // When multiple children are fill_container along the same axis, assume
    // horizontal flex so the layout engine distributes space evenly instead
    // of giving each child the full parent width (layout === "none" behavior).
    const children = container.children ?? [];
    if (children.length > 1) {
        const fillWidthCount = children.filter((c) => c.width === "fill_container").length;
        if (fillWidthCount > 1)
            return "horizontal";
    }
    return "none";
}
function getTextContent(node) {
    if (typeof node.content === "string")
        return node.content;
    return node.content.map((span) => span.content).join("");
}
function computeNodeSize(node, parentWidth, parentHeight, textMeasure) {
    let wSpec = parseSizing(node.width);
    let hSpec = parseSizing(node.height);
    // In .pen files, width/height: undefined means "hug content" (fit_content),
    // not collapse to 0. This applies to text, frames, and groups.
    if (wSpec.kind === "auto")
        wSpec = { kind: "fit_content", fallback: null };
    if (hSpec.kind === "auto")
        hSpec = { kind: "fit_content", fallback: null };
    let width = resolveSize(wSpec, parentWidth, "width");
    let height = resolveSize(hSpec, parentHeight, "height");
    if (wSpec.kind === "fit_content" || hSpec.kind === "fit_content") {
        const fitSize = computeFitContentSize(node, textMeasure);
        if (wSpec.kind === "fit_content")
            width = fitSize.width;
        if (hSpec.kind === "fit_content")
            height = fitSize.height;
    }
    return { width, height };
}
function resolveSize(spec, parentSize, _axis) {
    switch (spec.kind) {
        case "fixed":
            return spec.value;
        case "fill_container":
            if (parentSize !== null)
                return parentSize;
            return spec.fallback ?? 200;
        case "fit_content":
            return spec.fallback ?? 100;
        case "auto":
            return 0;
    }
}
function computeFitContentSize(node, textMeasure) {
    if (node.type === "text") {
        const text = getTextContent(node);
        const fontSize = node.fontSize ?? 16;
        const fontFamily = node.fontFamily ?? "sans-serif";
        const fontWeight = node.fontWeight;
        // Only constrain width if the node has an explicit width set.
        // fit_content text should measure at its unconstrained natural size.
        const explicitWidth = node.width !== undefined
            ? resolveSize(parseSizing(node.width), null, "width") || undefined
            : undefined;
        return textMeasure(text, fontSize, fontFamily, fontWeight, explicitWidth);
    }
    if (!isContainer(node)) {
        return { width: 100, height: 100 };
    }
    const children = node.children ?? [];
    if (children.length === 0) {
        return { width: 100, height: 100 };
    }
    const [pt, pr, pb, pl] = parsePadding(node.padding);
    const gap = node.gap ?? 0;
    const layout = inferLayout(node);
    if (layout === "horizontal") {
        let totalWidth = pl + pr;
        let maxChildHeight = 0;
        for (let i = 0; i < children.length; i++) {
            const childSize = computeNodeSize(children[i], null, null, textMeasure);
            totalWidth += childSize.width;
            if (i < children.length - 1)
                totalWidth += gap;
            if (childSize.height > maxChildHeight)
                maxChildHeight = childSize.height;
        }
        return { width: totalWidth, height: maxChildHeight + pt + pb };
    }
    if (layout === "vertical") {
        let totalHeight = pt + pb;
        let maxChildWidth = 0;
        for (let i = 0; i < children.length; i++) {
            const childSize = computeNodeSize(children[i], null, null, textMeasure);
            totalHeight += childSize.height;
            if (i < children.length - 1)
                totalHeight += gap;
            if (childSize.width > maxChildWidth)
                maxChildWidth = childSize.width;
        }
        return { width: maxChildWidth + pl + pr, height: totalHeight };
    }
    // layout === "none": size to bounding box of children
    let maxRight = 0;
    let maxBottom = 0;
    for (const child of children) {
        const childX = child.x ?? 0;
        const childY = child.y ?? 0;
        const childSize = computeNodeSize(child, null, null, textMeasure);
        const right = childX + childSize.width;
        const bottom = childY + childSize.height;
        if (right > maxRight)
            maxRight = right;
        if (bottom > maxBottom)
            maxBottom = bottom;
    }
    return { width: maxRight + pr, height: maxBottom + pb };
}
function computeMainAxisOffsets(justifyContent, totalContentSize, containerSize, childCount, gap) {
    const freeSpace = containerSize - totalContentSize;
    switch (justifyContent) {
        case "center":
            return { startOffset: freeSpace / 2, spaceBetween: gap };
        case "end":
            return { startOffset: freeSpace, spaceBetween: gap };
        case "space-between":
            if (childCount <= 1)
                return { startOffset: 0, spaceBetween: gap };
            return {
                startOffset: 0,
                spaceBetween: gap + freeSpace / (childCount - 1),
            };
        case "space-around": {
            const space = freeSpace / childCount;
            return { startOffset: space / 2, spaceBetween: gap + space };
        }
        case "space-evenly": {
            const space = freeSpace / (childCount + 1);
            return { startOffset: space, spaceBetween: gap + space };
        }
        case "start":
        default:
            return { startOffset: 0, spaceBetween: gap };
    }
}
function computeCrossAxisOffset(alignItems, childCrossSize, containerCrossSize) {
    switch (alignItems) {
        case "center":
            return (containerCrossSize - childCrossSize) / 2;
        case "end":
            return containerCrossSize - childCrossSize;
        case "start":
        default:
            return 0;
    }
}
function layoutChildren(container, containerRect, textMeasure) {
    const children = container.children ?? [];
    if (children.length === 0)
        return [];
    const [pt, pr, pb, pl] = parsePadding(container.padding);
    const gap = container.gap ?? 0;
    const layout = inferLayout(container);
    const availableWidth = containerRect.width - pl - pr;
    const availableHeight = containerRect.height - pt - pb;
    const contentOriginX = containerRect.x + pl;
    const contentOriginY = containerRect.y + pt;
    if (layout === "none") {
        return children.map((child) => {
            const childRelX = child.x ?? 0;
            const childRelY = child.y ?? 0;
            const childSize = computeNodeSize(child, availableWidth, availableHeight, textMeasure);
            const childRect = {
                x: contentOriginX + childRelX,
                y: contentOriginY + childRelY,
                width: childSize.width,
                height: childSize.height,
            };
            return buildLayoutNode(child, childRect, textMeasure);
        });
    }
    // Flex layout (horizontal or vertical)
    const isHorizontal = layout === "horizontal";
    const justifyContent = container.justifyContent;
    const alignItems = container.alignItems;
    const childInfos = children.map((child) => {
        const wSpec = parseSizing(child.width);
        const hSpec = parseSizing(child.height);
        const mainIsFill = isHorizontal
            ? wSpec.kind === "fill_container"
            : hSpec.kind === "fill_container";
        const crossIsFill = isHorizontal
            ? hSpec.kind === "fill_container"
            : wSpec.kind === "fill_container";
        let width = 0;
        let height = 0;
        if (!mainIsFill) {
            const parentW = isHorizontal ? null : availableWidth;
            const parentH = isHorizontal ? availableHeight : null;
            const size = computeNodeSize(child, parentW, parentH, textMeasure);
            width = size.width;
            height = size.height;
        }
        if (crossIsFill) {
            if (isHorizontal)
                height = availableHeight;
            else
                width = availableWidth;
        }
        return { child, wSpec, hSpec, width, height, isFillMain: mainIsFill };
    });
    const fillCount = childInfos.filter((c) => c.isFillMain).length;
    const fixedMainTotal = childInfos
        .filter((c) => !c.isFillMain)
        .reduce((sum, c) => sum + (isHorizontal ? c.width : c.height), 0);
    const totalGap = (children.length - 1) * gap;
    const remainingMain = (isHorizontal ? availableWidth : availableHeight) -
        fixedMainTotal -
        totalGap;
    const fillMainSize = fillCount > 0 ? Math.max(0, remainingMain / fillCount) : 0;
    for (const info of childInfos) {
        if (info.isFillMain) {
            if (isHorizontal) {
                info.width = fillMainSize;
                if (info.hSpec.kind === "fill_container") {
                    info.height = availableHeight;
                }
                else {
                    const size = computeNodeSize(info.child, info.width, availableHeight, textMeasure);
                    info.height = size.height;
                }
            }
            else {
                info.height = fillMainSize;
                if (info.wSpec.kind === "fill_container") {
                    info.width = availableWidth;
                }
                else {
                    const size = computeNodeSize(info.child, availableWidth, info.height, textMeasure);
                    info.width = size.width;
                }
            }
        }
    }
    const totalContentMain = childInfos.reduce((sum, c) => sum + (isHorizontal ? c.width : c.height), 0);
    const containerMain = isHorizontal ? availableWidth : availableHeight;
    const { startOffset, spaceBetween } = computeMainAxisOffsets(justifyContent, totalContentMain + totalGap, containerMain, children.length, gap);
    let mainCursor = (isHorizontal ? contentOriginX : contentOriginY) + startOffset;
    const crossOrigin = isHorizontal ? contentOriginY : contentOriginX;
    const containerCross = isHorizontal ? availableHeight : availableWidth;
    return childInfos.map((info, i) => {
        const childMain = isHorizontal ? info.width : info.height;
        const childCross = isHorizontal ? info.height : info.width;
        const crossOffset = computeCrossAxisOffset(alignItems, childCross, containerCross);
        const childRect = isHorizontal
            ? {
                x: mainCursor,
                y: crossOrigin + crossOffset,
                width: info.width,
                height: info.height,
            }
            : {
                x: crossOrigin + crossOffset,
                y: mainCursor,
                width: info.width,
                height: info.height,
            };
        mainCursor += childMain;
        if (i < childInfos.length - 1)
            mainCursor += spaceBetween;
        return buildLayoutNode(info.child, childRect, textMeasure);
    });
}
function buildLayoutNode(node, rect, textMeasure) {
    const clip = node.type === "frame" ? (node.clip ?? false) : false;
    const children = isContainer(node)
        ? layoutChildren(node, rect, textMeasure)
        : [];
    return { node, rect, children, clip };
}
export function layoutTree(nodes, textMeasure) {
    return nodes.map((node) => {
        const absX = node.x ?? 0;
        const absY = node.y ?? 0;
        const size = computeNodeSize(node, null, null, textMeasure);
        const rect = {
            x: absX,
            y: absY,
            width: size.width,
            height: size.height,
        };
        return buildLayoutNode(node, rect, textMeasure);
    });
}
//# sourceMappingURL=layout.js.map