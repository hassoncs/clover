export type EffectType = "glow" | "innerGlow" | "outline" | "dropShadow" | "tint" | "holographic" | "pixelate" | "dissolve" | "waveDistortion" | "shockwave" | "chromaticAberration" | "vignette" | "scanlines" | "posterize" | "blur" | "motionBlur" | "rimLight" | "colorMatrix" | "bloom" | "nightVision" | "speedLines" | "underwater" | "halftone" | "oldFilm" | "thermalVision" | "ascii" | "ripple" | "rbAurora" | "rbBalatro" | "rbColorBends" | "rbDarkVeil" | "rbFaultyTerminal" | "rbFloatingLines" | "rbGalaxy" | "rbGradientBlinds" | "rbGrainient" | "rbIridescence" | "rbLightRays" | "rbLightning" | "rbLiquidChrome" | "rbMetaBalls" | "rbOrb" | "rbPlasma" | "rbPrism" | "rbShapeBlur" | "rbSilk" | "rbThreads" | "fogOfWar" | "level" | "ramp" | "lfo" | "constantColor" | "circle" | "rectangle" | "transform" | "displace" | "lookup" | "math" | "threshold" | "hsvAdjust" | "edge" | "channelMix" | "crossFade" | "over" | "mirror" | "crop" | "resize" | "invert" | "emboss" | "sharpen" | "convolve" | "kaleidoscope" | "duotone" | "gradientMap" | "filmGrain" | "barrelDistort" | "mosaic";
export type UniformType = "float" | "int" | "vec2" | "vec3" | "vec4" | "color" | "bool";
export interface UniformDeclaration {
    name: string;
    type: UniformType;
    defaultValue?: number | number[] | string | boolean;
}
export type ShaderSource = {
    glsl: string;
    sksl?: string;
};
export type PersistenceMode = "none" | "pingPong";
export type QualityTier = "low" | "medium" | "high";
export type PlatformTier = "web-high" | "web-low" | "mobile-high" | "mobile-low";
export interface BudgetTierPolicy {
    maxPasses: number;
    maxResolutionScale: number;
    minCadence: number;
}
export type NodeFamily = "generator" | "filter" | "combiner";
export type BufferFormat = "rgba8" | "rgba16f";
export type ResolutionMode = "full" | "half" | "quarter" | "custom";
export type FusibilityFlag = "always" | "conditional" | "never";
export interface InputSlot {
    name: string;
    dataType: "texture" | "scalar" | "vec2" | "vec3" | "vec4" | "mask";
    connectedTo: {
        nodeId: string;
        output: string;
    } | null;
}
export interface OutputTarget {
    bufferId: string;
    format: BufferFormat;
    resolution: ResolutionMode;
    customWidth?: number;
    customHeight?: number;
}
export type ParamValue = number | string | boolean | number[] | Record<string, unknown>;
export interface EffectParamSchema {
    key: string;
    uniformName: string;
    type: UniformType;
    defaultValue: ParamValue;
    ui?: {
        displayName: string;
        category?: string;
        min?: number;
        max?: number;
        step?: number;
        options?: string[];
        description?: string;
    };
}
export interface EffectNode {
    id: string;
    type: string;
    family: NodeFamily;
    inputSlots: InputSlot[];
    params: Record<string, ParamValue>;
    paramsSchema?: EffectParamSchema[];
    outputTarget: OutputTarget;
    outputs?: Array<{
        name: string;
        bufferId: string;
    }>;
    flags: {
        stateful: boolean;
        fusible: FusibilityFlag;
    };
}
export interface Connection {
    from: {
        nodeId: string;
        output: string;
    };
    to: {
        nodeId: string;
        input: string;
    };
}
export interface FeedbackEdge {
    from: {
        nodeId: string;
        output: string;
    };
    to: {
        nodeId: string;
        input: string;
    };
    policy: FeedbackPolicy;
}
export interface FeedbackPolicy {
    initMode: "clear" | "seedFromInput" | "restoreSnapshot";
    clearColor?: string;
    swapPolicy: "pingPong";
    stopBehavior: "freeze" | "clear";
    bufferFormat: BufferFormat;
}
export interface ExternalInput {
    name: string;
    dataType: "texture";
    source: "screen" | "camera" | "url" | "entity";
}
export interface EffectGraphSpec {
    id: string;
    version: string;
    engineApiVersion: string;
    scope: "screen" | "entity";
    nodes: EffectNode[];
    connections: Connection[];
    feedbackEdges: FeedbackEdge[];
    externalInputs?: ExternalInput[];
    lifecycle: {
        autoStart: boolean;
        stopMode: "freeze" | "clear";
    };
}
export interface ResourceRef {
    id: string;
    type: "texture" | "buffer";
    format: BufferFormat;
    resolution: ResolutionMode;
}
export interface CompiledPass {
    id: string;
    shaderSource: ShaderSource;
    requires: ResourceRef[];
    provides: ResourceRef[];
    params: Record<string, unknown>;
    paramsSchema: UniformDeclaration[];
    persistence: PersistenceMode;
    qualityTier: QualityTier;
    constraints: {
        before?: string[];
        after?: string[];
        conflicts?: string[];
    };
}
export interface CompiledPlan {
    id: string;
    graphId: string;
    graphVersion: string;
    engineApiVersion: string;
    scope: "screen" | "entity";
    passes: CompiledPass[];
    resourceMap: Record<string, ResourceRef>;
    feedbackPolicies: Record<string, FeedbackPolicy>;
    hash: string;
    compiledAt: string;
}
//# sourceMappingURL=types.d.ts.map