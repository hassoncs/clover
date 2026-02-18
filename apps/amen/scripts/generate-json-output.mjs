async function generateJsonOutput(config, entries) {
  if (!config.jsonOutputFile || entries.length === 0) {
    return;
  }

  const fullJsonOutputFile = resolve(ROOT, config.jsonOutputFile);
  ensureDir(fullJsonOutputFile);

  const { execSync } = await import('child_process');
  const games = [];

  for (const entry of entries) {
    try {
      const importPath = entry.importPath.replace('@/', './');
      const fullImportPath = resolve(ROOT, importPath);
      
      const result = execSync(
        `npx tsx -e "import mod from '${fullImportPath}'; console.log(JSON.stringify(mod.default))"`,
        { encoding: 'utf-8', cwd: ROOT, maxBuffer: 50 * 1024 * 1024 }
      );
      
      const gameDef = JSON.parse(result.trim());

      games.push({
        id: entry.id,
        title: entry.meta.title || entry.id,
        description: entry.meta.description || `A ${entry.meta.title || entry.id} game`,
        definition: gameDef,
      });
    } catch (err) {
      console.error(`[${config.name}] Failed to load ${entry.id}: ${err.message}`);
    }
  }

  const jsonData = {
    generatedAt: new Date().toISOString(),
    games,
  };

  writeFileSync(fullJsonOutputFile, JSON.stringify(jsonData, null, 2));
  console.log(`[${config.name}] Generated ${config.jsonOutputFile} with ${games.length} games for API dev mode`);
}