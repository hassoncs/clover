export { decodeFigBuffer, encodeFigBuffer } from "./fig-codec";
export { exportFig } from "./fig-export";
export { importFig } from "./fig-import";
export type {
	FigColor,
	FigEffect,
	FigExportResult,
	FigGUID,
	FigImportResult,
	FigMatrix,
	FigMessage,
	FigNodeChange,
	FigPaint,
	FigParentIndex,
	FigVector,
} from "./fig-types";
export {
	createWarning,
	type FigConversionWarning,
	isSupportedNodeType,
	SUPPORTED_NODE_TYPES,
	SUPPORTED_PROPERTIES,
	type SupportedFigmaNodeType,
	UNSUPPORTED_FEATURES,
	UNSUPPORTED_NODE_TYPES,
	type UnsupportedFigmaNodeType,
} from "./support-matrix";
