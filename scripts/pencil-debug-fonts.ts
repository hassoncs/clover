import { readFileSync } from "fs";
const doc = JSON.parse(readFileSync("/tmp/pencil-cli-doc.json", "utf-8"));

// Check variable font values
const fontVars = Object.entries(doc.variables || {})
  .filter(([k]: [string, any]) => k.includes("font") || k.includes("Font"))
  .map(([k, v]: [string, any]) => [k, JSON.stringify(v)]);

console.log("Font-related variables:");
fontVars.forEach(([k, v]) => console.log(`  ${k}: ${v}`));

// Check if $--font-secondary resolves correctly
const varMap = Object.fromEntries(
  Object.entries(doc.variables || {}).map(([k, v]: [string, any]) => [k.startsWith("$") ? k.slice(1) : k, v])
);
console.log("\n$--font-secondary resolution:", JSON.stringify(varMap["font-secondary"]));
console.log("$--font-primary resolution:", JSON.stringify(varMap["font-primary"]));
console.log("$--muted-foreground resolution:", JSON.stringify(varMap["muted-foreground"]));

// Check: after resolveVarRefs, does $--font-secondary become "Inter"?
// The resolveVarRefs function returns vars[key]?.value ?? obj
const secondary = varMap["font-secondary"];
if (secondary) {
  console.log("\nsecondary type:", secondary.type);
  console.log("secondary value:", JSON.stringify(secondary.value));
  console.log("secondary resolved:", secondary.value ?? secondary);
}
