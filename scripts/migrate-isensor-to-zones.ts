/**
 * Migration Script: Transform physics.isSensor to Zone format
 * 
 * This script finds all object literals with physics property containing isSensor: true
 * and transforms them to use the new type: zone and zone: {...} format.
 * 
 * Usage:
 *   npx ts-node scripts/migrate-isensor-to-zones.ts <file-pattern>
 *   npx ts-node scripts/migrate-isensor-to-zones.ts --dry-run <file-pattern>
 */

import * as fs from "fs";

const globSync = require("glob").sync;

interface Config {
  dryRun: boolean;
  pattern: string;
}

function parseArgs(): Config {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run") || args.includes("-n");
  const patternIndex = args.findIndex((arg) => !arg.startsWith("-"));
  const pattern = patternIndex >= 0 ? args[patternIndex] : "**/*.ts";

  return { dryRun, pattern };
}

function extractPhysicsProps(physicsText: string): {
  bodyType: string | null;
  shape: string | null;
  width: number | null;
  height: number | null;
  radius: number | null;
  categoryBits: number | null;
  maskBits: number | null;
} {
  const result = {
    bodyType: null as string | null,
    shape: null as string | null,
    width: null as number | null,
    height: null as number | null,
    radius: null as number | null,
    categoryBits: null as number | null,
    maskBits: null as number | null,
  };

  const bodyTypeMatch = physicsText.match(/bodyType\s*:\s*["'](static|kinematic|dynamic)["']/);
  if (bodyTypeMatch) {
    result.bodyType = bodyTypeMatch[1];
  }

  const shapeMatch = physicsText.match(/shape\s*:\s*["'](box|circle|polygon)["']/);
  if (shapeMatch) {
    result.shape = shapeMatch[1];
  }

  const widthMatch = physicsText.match(/width\s*:\s*([\d.]+)/);
  if (widthMatch) {
    result.width = parseFloat(widthMatch[1]);
  }

  const heightMatch = physicsText.match(/height\s*:\s*([\d.]+)/);
  if (heightMatch) {
    result.height = parseFloat(heightMatch[1]);
  }

  const radiusMatch = physicsText.match(/radius\s*:\s*([\d.]+)/);
  if (radiusMatch) {
    result.radius = parseFloat(radiusMatch[1]);
  }

  const categoryBitsMatch = physicsText.match(/categoryBits\s*:\s*(\d+)/);
  if (categoryBitsMatch) {
    result.categoryBits = parseInt(categoryBitsMatch[1], 10);
  }

  const maskBitsMatch = physicsText.match(/maskBits\s*:\s*(\d+)/);
  if (maskBitsMatch) {
    result.maskBits = parseInt(maskBitsMatch[1], 10);
  }

  return result;
}

function buildZoneText(props: ReturnType<typeof extractPhysicsProps>): string {
  const parts: string[] = [];

  if (props.bodyType === "kinematic") {
    parts.push("movement: 'kinematic'");
  }

  const shapeParts: string[] = [];
  shapeParts.push(`type: ${props.shape || "'box'"}`);

  if (props.shape === "box" || props.shape === null) {
    if (props.width !== null) {
      shapeParts.push(`width: ${props.width}`);
    }
    if (props.height !== null) {
      shapeParts.push(`height: ${props.height}`);
    }
  } else if (props.shape === "circle") {
    if (props.radius !== null) {
      shapeParts.push(`radius: ${props.radius}`);
    }
  }

  parts.push(`shape: { ${shapeParts.join(", ") } }`);

  if (props.categoryBits !== null) {
    parts.push(`categoryBits: ${props.categoryBits}`);
  }

  if (props.maskBits !== null) {
    parts.push(`maskBits: ${props.maskBits}`);
  }

  return `{ ${parts.join(", ") } }`;
}

function transformFile(content: string): { transformed: number; newContent: string } {
  let transformed = 0;
  const lines = content.split('\n');
  const newLines: string[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    if (line.includes('isSensor: true')) {
      let j = i - 1;
      let physicsLineIndex = -1;
      let physicsBraceCount = 0;
      let physicsStartBrace = -1;
      
      while (j >= 0) {
        if (lines[j].includes('physics:')) {
          physicsLineIndex = j;
          physicsStartBrace = lines[j].indexOf('{');
          break;
        }
        j--;
      }
      
      if (physicsLineIndex !== -1) {
        const physicsLines: string[] = [];
        let currentBraceCount = 0;
        
        for (let k = physicsLineIndex; k < lines.length; k++) {
          const pl = lines[k];
          physicsLines.push(pl);
          
          for (const char of pl) {
            if (char === '{') currentBraceCount++;
            if (char === '}') currentBraceCount--;
          }
          
          if (currentBraceCount === 0) {
            break;
          }
        }
        
        const physicsText = physicsLines.join('\n');
        const physicsProps = extractPhysicsProps(physicsText);
        const zoneText = buildZoneText(physicsProps);
        
        const physicsLine = lines[physicsLineIndex];
        const indent = physicsLine.match(/^(\s*)/)?.[1] || '        ';
        
        const templateNameLineIndex = physicsLineIndex - 1;
        const templateNameLine = templateNameLineIndex >= 0 ? lines[templateNameLineIndex] : '';
        const templateIndent = templateNameLine.match(/^(\s*)/)?.[1] || '    ';
        
        const endBraceLineIndex = physicsLineIndex + physicsLines.length;
        
        const newPhysicsSection = [
          `${templateIndent}type: 'zone',`,
          `${templateIndent}zone: ${zoneText},`,
        ];
        
        for (let k = 0; k < physicsLineIndex; k++) {
          newLines.push(lines[k]);
        }
        
        for (const newLine of newPhysicsSection) {
          newLines.push(newLine);
        }
        
        for (let k = endBraceLineIndex; k < lines.length; k++) {
          newLines.push(lines[k]);
        }
        
        transformed++;
        
        const skipCount = endBraceLineIndex - i;
        i = endBraceLineIndex;
        
        continue;
      }
    }
    
    newLines.push(line);
    i++;
  }
  
  return { transformed, newContent: newLines.join('\n') };
}

async function processFile(filePath: string, config: Config): Promise<{ transformed: number; errors: string[] }> {
  const result = { transformed: 0, errors: [] as string[] };

  if (!fs.existsSync(filePath)) {
    result.errors.push(`File not found: ${filePath}`);
    return result;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { transformed, newContent } = transformFile(content);

    result.transformed = transformed;

    if (transformed > 0) {
      if (config.dryRun) {
        console.log(`\n=== ${filePath} ===`);
        console.log(`Would transform ${transformed} entity/ies:`);
        console.log(newContent);
      } else {
        fs.writeFileSync(filePath, newContent);
        console.log(`✓ Transformed ${transformed} entity/ies in ${filePath}`);
      }
    }
  } catch (error) {
    result.errors.push(`${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

async function main(): Promise<void> {
  const config = parseArgs();

  console.log("=== isSensor to Zone Migration ===\n");

  if (config.dryRun) {
    console.log("Mode: DRY RUN (no changes will be made)\n");
  }

  if (!config.pattern) {
    console.error("Error: No file pattern provided");
    console.error("Usage: npx ts-node scripts/migrate-isensor-to-zones.ts <file-pattern>");
    console.error("Example: npx ts-node scripts/migrate-isensor-to-zones.ts 'app/lib/test-games/**/*.ts'");
    process.exit(1);
  }

  console.log(`Pattern: ${config.pattern}\n`);

  const files = globSync(config.pattern, {
    ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**"],
  });

  if (files.length === 0) {
    console.log("No files found matching the pattern.");
    return;
  }

  console.log(`Found ${files.length} file(s)\n`);

  let totalTransformed = 0;
  let totalErrors = 0;

  for (const file of files) {
    try {
      const res = await processFile(file, config);
      totalTransformed += res.transformed;
      totalErrors += res.errors.length;

      for (const error of res.errors) {
        console.error(`  Error: ${error}`);
      }
    } catch (error) {
      console.error(`Failed to process ${file}:`, error);
      totalErrors++;
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Files processed: ${files.length}`);
  console.log(`Entities transformed: ${totalTransformed}`);
  console.log(`Errors: ${totalErrors}`);

  if (config.dryRun) {
    console.log("\nRun without --dry-run to apply changes.");
  } else if (totalTransformed > 0) {
    console.log("\nMigration complete! Review the changes and run tests.");
  }
}

main().catch(console.error);
