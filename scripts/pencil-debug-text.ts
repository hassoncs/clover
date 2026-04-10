import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "fs";

async function main() {
  const docJson = readFileSync("/tmp/pencil-cli-doc.json", "utf-8");
  const doc = JSON.parse(docJson);

  // Check text measurement for specific nodes
  // Find nodes with content
  const texts: Array<{ id: string; content: string; fontFamily?: string; fontSize?: number }> = [];
  function walk(nodes: any[]) {
    for (const node of nodes) {
      if (node.content && typeof node.content === "string") {
        texts.push({ id: node.id, content: node.content, fontFamily: node.fontFamily, fontSize: node.fontSize });
      }
      if (node.children) walk(node.children);
      if (node.descendants) {
        for (const d of Object.values(node.descendants) as any[]) {
          if (d.content) texts.push({ id: d.id, content: d.content, fontFamily: d.fontFamily, fontSize: d.fontSize });
          if (d.children) walk(d.children);
        }
      }
    }
  }
  walk(doc.children);
  
  console.log(`Found ${texts.length} text nodes. First 20:`);
  texts.slice(0, 20).forEach((t) => console.log(`  ${t.id}: "${t.content}" (${t.fontFamily}, ${t.fontSize})`));

  // Check what text-measure.ts does
  console.log("\nText measurement approach:");
  const tmContent = readFileSync("packages/design-canvas/src/pen/text-measure.ts", "utf-8");
  console.log(tmContent.substring(0, 800));
}
main();
