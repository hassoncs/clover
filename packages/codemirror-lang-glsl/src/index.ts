import { StreamLanguage, LanguageSupport } from '@codemirror/language';

interface GLSLState {
  inBlockComment: boolean;
}

const glslLanguage = StreamLanguage.define<GLSLState>({
  token(stream, state) {
    if (stream.match('//')) {
      stream.skipToEnd();
      return 'comment';
    }
    if (stream.match('/*')) {
      state.inBlockComment = true;
    }
    if (state.inBlockComment) {
      if (stream.match(/.*?\*\//)) {
        state.inBlockComment = false;
      } else {
        stream.skipToEnd();
      }
      return 'comment';
    }

    if (stream.match(/"[^"]*"/)) return 'string';

    if (stream.match(/#\w+/)) return 'meta';

    if (stream.match(/0x[0-9a-fA-F]+/) || stream.match(/\d+\.?\d*([eE][+-]?\d+)?[fFuU]?/) || stream.match(/\.\d+([eE][+-]?\d+)?[fFuU]?/)) {
      return 'number';
    }

    if (stream.match(/\b(void|bool|int|uint|float|double|vec[234]|ivec[234]|uvec[234]|bvec[234]|dvec[234]|mat[234]|mat[234]x[234]|sampler[123]D|sampler2DArray|samplerCube|sampler2DShadow|samplerCubeShadow|sampler2DArrayShadow|isampler[123]D|usampler[123]D|image[123]D)\b/)) {
      return 'typeName';
    }

    if (stream.match(/\b(if|else|for|while|do|switch|case|default|break|continue|return|discard|struct|layout|in|out|inout|uniform|varying|attribute|const|flat|smooth|noperspective|centroid|sample|patch|precision|highp|mediump|lowp|invariant|buffer|shared|coherent|volatile|restrict|readonly|writeonly|subroutine)\b/)) {
      return 'keyword';
    }

    if (stream.match(/\b(radians|degrees|sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|asinh|acosh|atanh|pow|exp|log|exp2|log2|sqrt|inversesqrt|abs|sign|floor|trunc|round|roundEven|ceil|fract|mod|modf|min|max|clamp|mix|step|smoothstep|isnan|isinf|length|distance|dot|cross|normalize|faceforward|reflect|refract|matrixCompMult|outerProduct|transpose|determinant|inverse|lessThan|lessThanEqual|greaterThan|greaterThanEqual|equal|notEqual|any|all|not|texture|textureSize|texelFetch|textureLod|textureOffset|dFdx|dFdy|fwidth|noise[1234]|emit|EmitVertex|EndPrimitive|barrier|memoryBarrier|memoryBarrierAtomicCounter|memoryBarrierBuffer|memoryBarrierImage|memoryBarrierShared|groupMemoryBarrier)\b/)) {
      return 'variableName.function';
    }

    if (stream.match(/\b(gl_Position|gl_PointSize|gl_ClipDistance|gl_VertexID|gl_InstanceID|gl_FragCoord|gl_FrontFacing|gl_PointCoord|gl_FragDepth|gl_SampleID|gl_SamplePosition|gl_NumSamples|gl_FragColor|gl_FragData|gl_MaxVertexAttribs|gl_MaxVertexUniformComponents|gl_MaxVaryingComponents|gl_MaxVertexOutputComponents|gl_MaxGeometryInputComponents|gl_MaxGeometryOutputComponents|gl_MaxFragmentInputComponents|gl_MaxVertexTextureImageUnits|gl_MaxCombinedTextureImageUnits|gl_MaxTextureImageUnits|gl_MaxFragmentUniformComponents|gl_MaxDrawBuffers|gl_MaxClipDistances|gl_MaxGeometryTextureImageUnits|gl_MaxGeometryOutputVertices|gl_MaxGeometryTotalOutputComponents|gl_MaxGeometryUniformComponents|gl_MaxGeometryVaryingComponents)\b/)) {
      return 'variableName.special';
    }

    if (stream.match(/\b(shader_type|render_mode|hint_color|hint_range|hint_albedo|hint_normal|source_color|COLOR|VERTEX|NORMAL|UV|UV2|TANGENT|BINORMAL|TIME|PI|TAU|E|SCREEN_UV|SCREEN_TEXTURE|DEPTH_TEXTURE|FRAGCOORD|INSTANCE_CUSTOM|MODEL_MATRIX|VIEW_MATRIX|PROJECTION_MATRIX|INV_VIEW_MATRIX|INV_PROJECTION_MATRIX|CAMERA_MATRIX|VIEWPORT_SIZE|NODE_POSITION_WORLD|NODE_POSITION_VIEW|POINT_SIZE|ALPHA|ALBEDO|METALLIC|ROUGHNESS|SPECULAR|EMISSION|BACKLIGHT|AO|SSS_STRENGTH|SSS_TRANSMITTANCE_COLOR|TRANSMISSION|RIM|RIM_TINT|CLEARCOAT|CLEARCOAT_ROUGHNESS|ANISOTROPY|ANISOTROPY_FLOW|FOG|LIGHT|ATTENUATION|SHADOW_ATTENUATION|DIFFUSE_LIGHT|SPECULAR_LIGHT|LIGHT_COLOR)\b/)) {
      return 'variableName.special';
    }

    if (stream.match(/\b(true|false)\b/)) return 'bool';

    if (stream.match(/[+\-*\/%=<>!&|^~?:]+/)) return 'operator';

    if (stream.match(/[{}()\[\];,\.]/)) return 'punctuation';

    if (stream.match(/[a-zA-Z_]\w*/)) return 'variableName';

    stream.next();
    return null;
  },
  startState() {
    return { inBlockComment: false };
  },
  copyState(state) {
    return { inBlockComment: state.inBlockComment };
  },
  languageData: {
    commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
  },
});

export function glsl(): LanguageSupport {
  return new LanguageSupport(glslLanguage);
}
