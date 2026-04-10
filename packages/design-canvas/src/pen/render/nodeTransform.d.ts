type TransformItem = {
    translateX: number;
} | {
    translateY: number;
} | {
    scaleX: number;
} | {
    scaleY: number;
};
export declare function buildNodeTransform(x: number, y: number, width: number, height: number, flipX?: boolean, flipY?: boolean): TransformItem[];
export {};
//# sourceMappingURL=nodeTransform.d.ts.map