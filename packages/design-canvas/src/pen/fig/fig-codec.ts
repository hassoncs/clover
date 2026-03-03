/**
 * Low-level .fig binary codec
 *
 * Handles the .fig file format:
 *   .fig = ZIP archive containing:
 *     - canvas.fig: fig-kiwi container (header + deflated schema + deflated data)
 *     - thumbnail.png (optional)
 *     - meta.json (optional)
 *
 * fig-kiwi container format:
 *   "fig-kiwi" (8 bytes) + version (4 bytes LE) + chunks[]
 *   Each chunk: length (4 bytes LE) + data
 *   Chunk 0: deflated Kiwi schema
 *   Chunk 1: deflated Kiwi message data
 *
 * Dependencies: Uses fflate for ZIP and deflate operations.
 */

import { deflateSync, inflateSync, unzipSync, zipSync } from "fflate";
import type { FigMessage } from "./fig-types";
import {
	ByteBuffer,
	compileSchema,
	decodeBinarySchema,
	encodeBinarySchema,
} from "./kiwi/kiwi-schema";
import figmaSchema from "./kiwi/schema";

const FIG_KIWI_HEADER = "fig-kiwi";
const FIG_KIWI_VERSION = 106;

// ---------------------------------------------------------------------------
// Compiled schema (lazy singleton)
// ---------------------------------------------------------------------------

interface CompiledFigSchema {
	decodeMessage(data: Uint8Array): unknown;
	encodeMessage(message: unknown): Uint8Array;
}

let compiledSchema: CompiledFigSchema | null = null;

function getCompiledSchema(): CompiledFigSchema {
	if (!compiledSchema) {
		compiledSchema = compileSchema(figmaSchema) as CompiledFigSchema;
	}
	return compiledSchema;
}

// ---------------------------------------------------------------------------
// Decode .fig buffer → FigMessage
// ---------------------------------------------------------------------------

export function decodeFigBuffer(buffer: ArrayBuffer): FigMessage {
	const zip = unzipSync(new Uint8Array(buffer));
	const entries = Object.keys(zip);

	// Find canvas data
	let canvasData: Uint8Array | null = null;
	for (const name of entries) {
		if (name === "canvas.fig" || name === "canvas") {
			canvasData = zip[name];
			break;
		}
	}

	// Fallback: largest non-image entry
	if (!canvasData) {
		let maxSize = 0;
		for (const name of entries) {
			const lower = name.toLowerCase();
			if (
				lower.endsWith(".png") ||
				lower.endsWith(".jpg") ||
				lower.endsWith(".json")
			)
				continue;
			if (zip[name].byteLength > maxSize) {
				maxSize = zip[name].byteLength;
				canvasData = zip[name];
			}
		}
	}

	if (!canvasData) {
		throw new Error(
			`No canvas data found in .fig file. Entries: ${entries.join(", ")}`,
		);
	}

	// Parse fig-kiwi container
	const payload = parseFigKiwiContainer(canvasData);
	if (!payload) {
		throw new Error("Invalid fig-kiwi container");
	}

	// Decode schema and message
	const schemaBytes = inflateSync(payload.schemaDeflated);
	const schema = decodeBinarySchema(new ByteBuffer(schemaBytes));
	const compiled = compileSchema(schema) as CompiledFigSchema;
	const message = compiled.decodeMessage(payload.dataRaw) as FigMessage;

	return message;
}

// ---------------------------------------------------------------------------
// Encode FigMessage → .fig buffer
// ---------------------------------------------------------------------------

export function encodeFigBuffer(message: FigMessage): ArrayBuffer {
	const compiled = getCompiledSchema();
	const schemaBytes = encodeBinarySchema(figmaSchema);
	const schemaDeflated = deflateSync(schemaBytes);
	const kiwiData = compiled.encodeMessage(message);

	const canvasData = buildFigKiwi(schemaDeflated, kiwiData);

	const metaJson = JSON.stringify({
		version: 1,
		app: "Slopcade",
		createdAt: new Date().toISOString(),
	});

	const result = zipSync({
		"canvas.fig": [canvasData, { level: 0 }],
		"meta.json": new TextEncoder().encode(metaJson),
	});

	return result.buffer;
}

// ---------------------------------------------------------------------------
// fig-kiwi container helpers
// ---------------------------------------------------------------------------

interface FigKiwiPayload {
	schemaDeflated: Uint8Array;
	dataRaw: Uint8Array;
}

function parseFigKiwiContainer(data: Uint8Array): FigKiwiPayload | null {
	const header = new TextDecoder().decode(data.slice(0, 8));
	if (header !== FIG_KIWI_HEADER) return null;

	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	let offset = 12; // skip header (8) + version (4)

	const chunks: Uint8Array[] = [];
	while (offset < data.length) {
		const len = view.getUint32(offset, true);
		offset += 4;
		chunks.push(data.slice(offset, offset + len));
		offset += len;
	}

	if (chunks.length < 2) return null;

	// Chunk 1 may be deflated or raw
	const compressed = chunks[1];
	let dataRaw: Uint8Array;
	try {
		dataRaw = inflateSync(compressed);
	} catch {
		dataRaw = compressed;
	}

	return { schemaDeflated: chunks[0], dataRaw };
}

function buildFigKiwi(
	schemaDeflated: Uint8Array,
	dataRaw: Uint8Array,
): Uint8Array {
	const dataDeflated = deflateSync(dataRaw);

	const total = 8 + 4 + 4 + schemaDeflated.length + 4 + dataDeflated.length;
	const out = new Uint8Array(total);
	const view = new DataView(out.buffer);

	out.set(new TextEncoder().encode(FIG_KIWI_HEADER), 0);
	view.setUint32(8, FIG_KIWI_VERSION, true);

	let offset = 12;
	view.setUint32(offset, schemaDeflated.length, true);
	offset += 4;
	out.set(schemaDeflated, offset);
	offset += schemaDeflated.length;

	view.setUint32(offset, dataDeflated.length, true);
	offset += 4;
	out.set(dataDeflated, offset);

	return out;
}
