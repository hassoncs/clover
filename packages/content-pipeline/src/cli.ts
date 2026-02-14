#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as buildPack from "./commands/build-pack.js";
import * as generate from "./commands/generate.js";
import * as ingest from "./commands/ingest.js";
import * as moderate from "./commands/moderate.js";
import * as stats from "./commands/stats.js";
import * as validateModels from "./commands/validate-models.js";

yargs(hideBin(process.argv))
	.command(
		"generate",
		"Generate content using AI",
		generate.builder,
		generate.handler,
	)
	.command(
		"ingest",
		"Ingest content from external sources",
		ingest.builder,
		ingest.handler,
	)
	.command(
		"moderate",
		"Moderate content items",
		moderate.builder,
		moderate.handler,
	)
	.command(
		"build-pack",
		"Build a content pack",
		buildPack.builder,
		buildPack.handler,
	)
	.command(
		"stats",
		"Show content pipeline statistics",
		stats.builder,
		stats.handler,
	)
	.command(
		"validate-models",
		"Validate all model presets work",
		validateModels.builder,
		validateModels.handler,
	)
	.demandCommand(1, "You must specify a command")
	.help()
	.alias("help", "h")
	.version()
	.alias("version", "v")
	.parse();
