/**
 * Game Logger - Configurable logging system for the game engine
 *
 * Provides per-category log level control with a simple API.
 * Default level is WARN to suppress most noise in production.
 */

export enum LogLevel {
  SILENT = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  TRACE = 5,
}

export type LogCategory =
  | 'lifecycle'
  | 'input'
  | 'physics'
  | 'rules'
  | 'entities'
  | 'bridge'
  | 'assets'
  | 'render'
  | 'state'
  | 'loop'
  | 'inspector';

interface LogConfig {
  level: LogLevel;
  categories: Partial<Record<LogCategory, LogLevel>>;
}

export interface LoggerConfig {
  level?: LogLevel;
  categories?: Partial<Record<LogCategory, LogLevel>>;
}

class GameLogger {
  private config: LogConfig = {
    level: LogLevel.DEBUG,
    categories: {},
  };

  configure(config: LoggerConfig): void {
    if (config.level !== undefined) {
      this.config.level = config.level;
    }
    if (config.categories !== undefined) {
      this.config.categories = { ...this.config.categories, ...config.categories };
    }
  }

  getConfig(): LogConfig {
    return { ...this.config };
  }

  private shouldLog(level: LogLevel, category: LogCategory): boolean {
    const categoryLevel = this.config.categories[category];
    const effectiveLevel = categoryLevel ?? this.config.level;
    return level <= effectiveLevel;
  }

  error(category: LogCategory, message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR, category)) {
      console.error(`[${category}:error] ${message}`, ...args);
    }
  }

  warn(category: LogCategory, message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN, category)) {
      console.warn(`[${category}:warn] ${message}`, ...args);
    }
  }

  info(category: LogCategory, message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO, category)) {
      console.log(`[${category}:info] ${message}`, ...args);
    }
  }

  debug(category: LogCategory, message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG, category)) {
      console.log(`[${category}:debug] ${message}`, ...args);
    }
  }

  trace(category: LogCategory, message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.TRACE, category)) {
      console.log(`[${category}:trace] ${message}`, ...args);
    }
  }
}

export const logger = new GameLogger();

export function getLogger(): GameLogger {
  return logger;
}
