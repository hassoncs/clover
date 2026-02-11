import type { BuildManifest, TagPayloads } from '@slopcade/shared';
import { PackageValidator, type ValidationError } from './PackageValidator';

type D1Database = import('@cloudflare/workers-types').D1Database;

export interface ReadinessState {
  ready: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  buildId: string;
  gameId: string;
  checkedAt: number;
}

interface ReadinessRow {
  game_id: string;
  build_id: string;
  ready: number;
  errors_json: string;
  warnings_json: string;
  checked_at: number;
}

export class ReadinessService {
  private readonly validator: PackageValidator;

  constructor(
    private readonly db: D1Database,
  ) {
    this.validator = new PackageValidator();
  }

  async checkReadiness(
    gameId: string,
    buildId: string,
    manifest: BuildManifest,
    artifacts: Partial<TagPayloads>,
  ): Promise<ReadinessState> {
    const result = this.validator.validateBuild(manifest, artifacts);
    const now = Date.now();

    const state: ReadinessState = {
      ready: result.valid,
      errors: result.errors,
      warnings: result.warnings,
      buildId,
      gameId,
      checkedAt: now,
    };

    await this.persistReadiness(state);

    return state;
  }

  async getReadiness(
    gameId: string,
    buildId: string,
  ): Promise<ReadinessState | null> {
    const row = await this.db
      .prepare(
        'SELECT * FROM package_readiness WHERE game_id = ? AND build_id = ?',
      )
      .bind(gameId, buildId)
      .first<ReadinessRow>();

    if (!row) return null;
    return this.rowToState(row);
  }

  async getLatestReadiness(
    gameId: string,
  ): Promise<ReadinessState | null> {
    const row = await this.db
      .prepare(
        'SELECT * FROM package_readiness WHERE game_id = ? ORDER BY checked_at DESC LIMIT 1',
      )
      .bind(gameId)
      .first<ReadinessRow>();

    if (!row) return null;
    return this.rowToState(row);
  }

  private async persistReadiness(state: ReadinessState): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO package_readiness (game_id, build_id, ready, errors_json, warnings_json, checked_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(game_id, build_id) DO UPDATE SET
           ready = excluded.ready,
           errors_json = excluded.errors_json,
           warnings_json = excluded.warnings_json,
           checked_at = excluded.checked_at`,
      )
      .bind(
        state.gameId,
        state.buildId,
        state.ready ? 1 : 0,
        JSON.stringify(state.errors),
        JSON.stringify(state.warnings),
        state.checkedAt,
      )
      .run();
  }

  private rowToState(row: ReadinessRow): ReadinessState {
    return {
      ready: row.ready === 1,
      errors: JSON.parse(row.errors_json) as ValidationError[],
      warnings: JSON.parse(row.warnings_json) as ValidationError[],
      buildId: row.build_id,
      gameId: row.game_id,
      checkedAt: row.checked_at,
    };
  }
}
