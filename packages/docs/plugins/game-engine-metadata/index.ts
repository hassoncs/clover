import path from 'node:path';
import fs from 'node:fs/promises';

import logger from '@docusaurus/logger';
import type { LoadContext, Plugin } from '@docusaurus/types';
import chokidar from 'chokidar';
import {
  Node,
  Project,
  SyntaxKind,
  type Expression,
  type ObjectLiteralExpression,
  type SourceFile,
  type Type,
} from 'ts-morph';
import * as ts from 'typescript';

type ExtractedProperty = {
  name: string;
  type: string;
  required: boolean;
  description?: string;
};

type ExtractedDiscriminatedType = {
  type: string;
  interfaceName: string;
  displayName: string;
  description?: string;
  properties: ExtractedProperty[];
};

type ExtractedEffect = {
  type: string;
  displayName: string;
  description: string;
  category: string;
  params: unknown[];
  defaultValues?: unknown;
};

type ExtractedParticle = {
  type: string;
  displayName: string;
  description: string;
  icon?: string;
};

type ExtractedGame = {
  id: string;
  title: string;
  description: string;
  gameId?: string;
  sourcePath: string;
};

type RulesExport = {
  triggers: ExtractedDiscriminatedType[];
  conditions: ExtractedDiscriminatedType[];
  actions: ExtractedDiscriminatedType[];
};

const PLUGIN_NAME = 'game-engine-metadata';

function toTitleCaseFromPascalCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .trim();
}

function displayNameFromInterfaceName(interfaceName: string): string {
  const trimmed = interfaceName
    .replace(/Behavior$/u, '')
    .replace(/Trigger$/u, '')
    .replace(/Condition$/u, '')
    .replace(/Action$/u, '');
  return toTitleCaseFromPascalCase(trimmed);
}

function getJsDocText(node: Node): string | undefined {
  const ranges = node.getLeadingCommentRanges();
  if (ranges.length === 0) return undefined;

  const raw = ranges
    .map((r) => r.getText())
    .find((t) => t.trimStart().startsWith('/**'));

  if (!raw) return undefined;

  const body = raw
    .replace(/^\s*\/\*\*/u, '')
    .replace(/\*\/\s*$/u, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/u, '').trimEnd())
    .join('\n')
    .trim();

  return body.length > 0 ? body : undefined;
}

function evalLiteralExpression(expr: Expression): unknown {
  if (Node.isStringLiteral(expr) || Node.isNoSubstitutionTemplateLiteral(expr)) {
    return expr.getLiteralValue();
  }
  if (Node.isNumericLiteral(expr)) {
    return Number(expr.getText());
  }
  if (expr.getKind() === SyntaxKind.TrueKeyword) return true;
  if (expr.getKind() === SyntaxKind.FalseKeyword) return false;
  if (expr.getKind() === SyntaxKind.NullKeyword) return null;

  if (Node.isArrayLiteralExpression(expr)) {
    return expr.getElements().map((e) => {
      if (!Node.isExpression(e)) return undefined;
      return evalLiteralExpression(e);
    });
  }

  if (Node.isObjectLiteralExpression(expr)) {
    const out: Record<string, unknown> = {};
    for (const prop of expr.getProperties()) {
      if (Node.isPropertyAssignment(prop)) {
        const nameNode = prop.getNameNode();
        const key = Node.isStringLiteral(nameNode)
          ? nameNode.getLiteralValue()
          : nameNode.getText();
        out[key] = evalLiteralExpression(prop.getInitializerOrThrow());
        continue;
      }
      if (Node.isShorthandPropertyAssignment(prop)) {
        // Not safe to evaluate without runtime context
        out[prop.getName()] = undefined;
        continue;
      }
      if (Node.isSpreadAssignment(prop)) {
        // Avoid brittle merging; represent as unknown
        return undefined;
      }
      return undefined;
    }
    return out;
  }

  if (Node.isAsExpression(expr) || Node.isTypeAssertion(expr) || Node.isParenthesizedExpression(expr)) {
    const inner = Node.isParenthesizedExpression(expr) ? expr.getExpression() : expr.getExpression();
    return evalLiteralExpression(inner);
  }

  if (Node.isPrefixUnaryExpression(expr)) {
    const op = expr.getOperatorToken();
    const inner = expr.getOperand();
    const v = Node.isExpression(inner) ? evalLiteralExpression(inner) : undefined;
    if (typeof v === 'number' && op === SyntaxKind.MinusToken) return -v;
    if (typeof v === 'number' && op === SyntaxKind.PlusToken) return v;
    return undefined;
  }

  // TemplateExpression / Identifier / CallExpression etc.
  return undefined;
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJsonIfChanged(filePath: string, data: unknown): Promise<void> {
  const next = `${JSON.stringify(data, null, 2)}\n`;
  try {
    const prev = await fs.readFile(filePath, 'utf8');
    if (prev === next) return;
  } catch {
    // ignore
  }
  await fs.writeFile(filePath, next, 'utf8');
}

function getStringLiteralFromType(type: Type): string | undefined {
  const literal = type.getLiteralValue();
  return typeof literal === 'string' ? literal : undefined;
}

function extractPropertiesForObjectType(objectType: Type): ExtractedProperty[] {
  const props: ExtractedProperty[] = [];
  for (const symbol of objectType.getProperties()) {
    const name = symbol.getName();
    if (name === 'type') continue;

    const decl = symbol.getDeclarations().find((d) => Node.isPropertySignature(d) || Node.isPropertyDeclaration(d));

    const required = decl
      ? !(
          (Node.isPropertySignature(decl) && decl.hasQuestionToken()) ||
          (Node.isPropertyDeclaration(decl) && decl.hasQuestionToken())
        )
      : true;

    const typeText = decl
      ? (decl.getTypeNode()?.getText() ?? symbol.getTypeAtLocation(decl).getText(decl))
      : symbol.getTypeAtLocation(objectType.getSymbolOrThrow().getDeclarations()[0]).getText();

    const description = decl ? getJsDocText(decl) : undefined;
    props.push({ name, type: typeText, required, description });
  }

  props.sort((a, b) => a.name.localeCompare(b.name));
  return props;
}

function extractDiscriminatedUnion(type: Type): ExtractedDiscriminatedType[] {
  if (!type.isUnion()) return [];

  const out: ExtractedDiscriminatedType[] = [];
  for (const member of type.getUnionTypes()) {
    const memberType = member.getApparentType();
    const typeProp = memberType.getProperty('type');
    if (!typeProp) continue;

    const decl = typeProp.getDeclarations().find((d) => Node.isPropertySignature(d) || Node.isPropertyDeclaration(d));
    const typeValue = decl ? getStringLiteralFromType(typeProp.getTypeAtLocation(decl)) : undefined;
    if (!typeValue) continue;

    const sym = memberType.getSymbol();
    const interfaceName = sym?.getName() ?? typeValue;
    const symDecl = sym?.getDeclarations()[0];
    const description = symDecl ? getJsDocText(symDecl) : undefined;

    out.push({
      type: typeValue,
      interfaceName,
      displayName: displayNameFromInterfaceName(interfaceName),
      description,
      properties: extractPropertiesForObjectType(memberType),
    });
  }

  out.sort((a, b) => a.type.localeCompare(b.type));
  return out;
}

async function buildProject(repoRoot: string): Promise<Project> {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      strict: true,
    },
  });

  project.addSourceFilesAtPaths(path.join(repoRoot, 'shared/src/types/**/*.ts'));
  project.addSourceFilesAtPaths(path.join(repoRoot, 'shared/src/systems/**/*.ts'));
  project.addSourceFilesAtPaths(path.join(repoRoot, 'shared/src/expressions/**/*.ts'));
  project.addSourceFilesAtPaths(path.join(repoRoot, 'app/lib/test-games/games/**/game.ts'));
  return project;
}

function extractBehaviors(project: Project, repoRoot: string): ExtractedDiscriminatedType[] {
  const filePath = path.join(repoRoot, 'shared/src/types/behavior.ts');
  const sf = project.getSourceFile(filePath);
  if (!sf) throw new Error(`Missing source file: ${filePath}`);

  const alias = sf.getTypeAlias('Behavior');
  if (!alias) throw new Error(`Missing type alias Behavior in ${filePath}`);
  return extractDiscriminatedUnion(alias.getType());
}

function extractEffects(project: Project, repoRoot: string): ExtractedEffect[] {
  const filePath = path.join(repoRoot, 'shared/src/types/effects.ts');
  const sf = project.getSourceFile(filePath);
  if (!sf) throw new Error(`Missing source file: ${filePath}`);

  const specAlias = sf.getTypeAlias('EffectSpec');
  const supportedTypes = new Set(
    specAlias ? extractDiscriminatedUnion(specAlias.getType()).map((t) => t.type) : []
  );

  const decl = sf.getVariableDeclaration('EFFECT_METADATA');
  const init = decl?.getInitializer();
  if (!init || !Node.isObjectLiteralExpression(init)) {
    throw new Error(`EFFECT_METADATA is not an object literal in ${filePath}`);
  }

  const raw = evalLiteralExpression(init);
  if (!raw || typeof raw !== 'object') throw new Error(`Failed to evaluate EFFECT_METADATA in ${filePath}`);

  const out: ExtractedEffect[] = [];
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const o = v as Record<string, unknown>;
    const type = String(o.type ?? k);
    if (supportedTypes.size > 0 && !supportedTypes.has(type)) continue;
    out.push({
      type,
      displayName: String(o.displayName ?? k),
      description: String(o.description ?? ''),
      category: String(o.category ?? ''),
      params: Array.isArray(o.params) ? o.params : [],
      defaultValues: o.defaultValues,
    });
  }
  out.sort((a, b) => a.type.localeCompare(b.type));
  return out;
}

function extractParticles(project: Project, repoRoot: string): ExtractedParticle[] {
  const filePath = path.join(repoRoot, 'shared/src/types/particles.ts');
  const sf = project.getSourceFile(filePath);
  if (!sf) throw new Error(`Missing source file: ${filePath}`);

  const decl = sf.getVariableDeclaration('PARTICLE_EMITTER_METADATA');
  const init = decl?.getInitializer();
  if (!init || !Node.isArrayLiteralExpression(init)) {
    throw new Error(`PARTICLE_EMITTER_METADATA is not an array literal in ${filePath}`);
  }

  const raw = evalLiteralExpression(init);
  if (!Array.isArray(raw)) throw new Error(`Failed to evaluate PARTICLE_EMITTER_METADATA in ${filePath}`);

  const out: ExtractedParticle[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    out.push({
      type: String(o.type ?? ''),
      displayName: String(o.displayName ?? ''),
      description: String(o.description ?? ''),
      icon: typeof o.icon === 'string' ? o.icon : undefined,
    });
  }

  out.sort((a, b) => a.type.localeCompare(b.type));
  return out;
}

function extractRules(project: Project, repoRoot: string): RulesExport {
  const filePath = path.join(repoRoot, 'shared/src/types/rules.ts');
  const sf = project.getSourceFile(filePath);
  if (!sf) throw new Error(`Missing source file: ${filePath}`);

  const triggerAlias = sf.getTypeAlias('RuleTrigger');
  const conditionAlias = sf.getTypeAlias('RuleCondition');
  const actionAlias = sf.getTypeAlias('RuleAction');

  if (!triggerAlias || !conditionAlias || !actionAlias) {
    throw new Error(`Missing RuleTrigger/RuleCondition/RuleAction in ${filePath}`);
  }

  return {
    triggers: extractDiscriminatedUnion(triggerAlias.getType()),
    conditions: extractDiscriminatedUnion(conditionAlias.getType()),
    actions: extractDiscriminatedUnion(actionAlias.getType()),
  };
}

function findExportedConstObjectLiteral(sourceFile: SourceFile, name: string): ObjectLiteralExpression | undefined {
  const decl = sourceFile.getVariableDeclaration(name);
  const statement = decl?.getVariableStatement();
  if (!decl || !statement) return undefined;
  if (!statement.isExported()) return undefined;
  const init = decl.getInitializer();
  return init && Node.isObjectLiteralExpression(init) ? init : undefined;
}

function findGameIdInGameDefinition(sourceFile: SourceFile): string | undefined {
  const decl = sourceFile.getVariableDeclaration('game');
  const init = decl?.getInitializer();
  if (!init || !Node.isObjectLiteralExpression(init)) return undefined;

  const metaProp = init.getProperty('metadata');
  if (!metaProp || !Node.isPropertyAssignment(metaProp)) return undefined;
  const metaInit = metaProp.getInitializer();
  if (!metaInit || !Node.isObjectLiteralExpression(metaInit)) return undefined;
  const idProp = metaInit.getProperty('id');
  if (!idProp || !Node.isPropertyAssignment(idProp)) return undefined;
  const idInit = idProp.getInitializer();
  if (!idInit || !Node.isStringLiteral(idInit)) return undefined;
  return idInit.getLiteralValue();
}

function extractGames(project: Project, repoRoot: string): ExtractedGame[] {
  const gameFiles = project.getSourceFiles().filter((sf) => sf.getFilePath().includes(path.join('app', 'lib', 'test-games', 'games')));
  const out: ExtractedGame[] = [];

  for (const sf of gameFiles) {
    const metaObj = findExportedConstObjectLiteral(sf, 'metadata');
    if (!metaObj) continue;
    const meta = evalLiteralExpression(metaObj);
    if (!meta || typeof meta !== 'object') continue;

    const o = meta as Record<string, unknown>;
    const title = typeof o.title === 'string' ? o.title : undefined;
    const description = typeof o.description === 'string' ? o.description : undefined;
    if (!title || !description) continue;

    const sourcePath = sf.getFilePath();
    const dirName = path.basename(path.dirname(sourcePath));
    const gameId = findGameIdInGameDefinition(sf);

    out.push({
      id: dirName,
      title,
      description,
      gameId,
      sourcePath: path.relative(repoRoot, sourcePath),
    });
  }

  out.sort((a, b) => a.id.localeCompare(b.id));
  return out;
}

class EngineMetadataGenerator {
  private projectPromise: Promise<Project> | undefined;
  private extracting: Promise<void> | undefined;
  private pending = false;

  constructor(
    private readonly repoRoot: string,
    private readonly outDir: string
  ) {}

  private async getProject(): Promise<Project> {
    this.projectPromise ??= buildProject(this.repoRoot);
    return this.projectPromise;
  }

  async extractAll(reason: string): Promise<void> {
    if (this.extracting) {
      this.pending = true;
      return;
    }

    this.extracting = (async () => {
      const startedAt = Date.now();
      await ensureDir(this.outDir);

      const project = await this.getProject();

      try {
        // Refresh in-memory AST in case FS changed
        for (const sf of project.getSourceFiles()) {
          await sf.refreshFromFileSystem();
        }
      } catch (err) {
        logger.warn(`[${PLUGIN_NAME}] Failed to refresh project from filesystem: ${String(err)}`);
      }

      const outputs: {
        behaviors: ExtractedDiscriminatedType[];
        effects: ExtractedEffect[];
        particles: ExtractedParticle[];
        rules: RulesExport;
        games: ExtractedGame[];
      } = {
        behaviors: [],
        effects: [],
        particles: [],
        rules: { triggers: [], conditions: [], actions: [] },
        games: [],
      };

      try {
        outputs.behaviors = extractBehaviors(project, this.repoRoot);
      } catch (err) {
        logger.warn(`[${PLUGIN_NAME}] behaviors extraction failed: ${String(err)}`);
      }

      try {
        outputs.effects = extractEffects(project, this.repoRoot);
      } catch (err) {
        logger.warn(`[${PLUGIN_NAME}] effects extraction failed: ${String(err)}`);
      }

      try {
        outputs.particles = extractParticles(project, this.repoRoot);
      } catch (err) {
        logger.warn(`[${PLUGIN_NAME}] particles extraction failed: ${String(err)}`);
      }

      try {
        outputs.rules = extractRules(project, this.repoRoot);
      } catch (err) {
        logger.warn(`[${PLUGIN_NAME}] rules extraction failed: ${String(err)}`);
      }

      try {
        outputs.games = extractGames(project, this.repoRoot);
      } catch (err) {
        logger.warn(`[${PLUGIN_NAME}] games extraction failed: ${String(err)}`);
      }

      await Promise.all([
        writeJsonIfChanged(path.join(this.outDir, 'behaviors.json'), outputs.behaviors),
        writeJsonIfChanged(path.join(this.outDir, 'effects.json'), outputs.effects),
        writeJsonIfChanged(path.join(this.outDir, 'particles.json'), outputs.particles),
        writeJsonIfChanged(path.join(this.outDir, 'rules.json'), outputs.rules),
        writeJsonIfChanged(path.join(this.outDir, 'games.json'), outputs.games),
      ]);

      const tookMs = Date.now() - startedAt;
      logger.info(
        `[${PLUGIN_NAME}] wrote metadata (${reason}) in ${tookMs}ms: ` +
          `behaviors=${outputs.behaviors.length}, effects=${outputs.effects.length}, ` +
          `particles=${outputs.particles.length}, ` +
          `rules={t:${outputs.rules.triggers.length},c:${outputs.rules.conditions.length},a:${outputs.rules.actions.length}}, ` +
          `games=${outputs.games.length}`
      );
    })().finally(() => {
      this.extracting = undefined;
    });

    await this.extracting;
    if (this.pending) {
      this.pending = false;
      await this.extractAll('debounced');
    }
  }
}

let watcherStarted = false;

export default async function gameEngineMetadataPlugin(context: LoadContext): Promise<Plugin<void>> {
  const repoRoot = path.resolve(context.siteDir, '..', '..');
  const outDir = path.join(context.siteDir, 'static', 'data');
  const generator = new EngineMetadataGenerator(repoRoot, outDir);

  return {
    name: PLUGIN_NAME,
    async loadContent() {
      // Initial extraction must finish before build/dev pages rely on static/data
      await generator.extractAll('initial');

      if (process.env.NODE_ENV === 'development' && !watcherStarted) {
        watcherStarted = true;
        const watchGlobs = [
          path.join(repoRoot, 'shared/src/types/**/*.ts'),
          path.join(repoRoot, 'app/lib/test-games/games/**/*.ts'),
        ];

        let timer: NodeJS.Timeout | undefined;
        const schedule = (why: string) => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            void generator.extractAll(`watch:${why}`);
          }, 500);
        };

        chokidar
          .watch(watchGlobs, {
            ignoreInitial: true,
          })
          .on('add', (p) => schedule(`add:${path.relative(repoRoot, p)}`))
          .on('change', (p) => schedule(`change:${path.relative(repoRoot, p)}`))
          .on('unlink', (p) => schedule(`unlink:${path.relative(repoRoot, p)}`))
          .on('error', (err) => {
            logger.warn(`[${PLUGIN_NAME}] watcher error: ${String(err)}`);
          });

        logger.info(`[${PLUGIN_NAME}] watching for changes...`);
      }
      return;
    },
  };
}
