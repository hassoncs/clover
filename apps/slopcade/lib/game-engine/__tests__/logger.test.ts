import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger, getLogger, LogLevel } from '../debug/Logger';

describe('Logger', () => {
  beforeEach(() => {
    logger.configure({
      level: LogLevel.WARN,
      categories: {},
    });
  });

  describe('default level WARN', () => {
    it('should suppress INFO messages at default level', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.info('lifecycle', 'test info message');

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should suppress DEBUG messages at default level', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.debug('entities', 'test debug message');

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should suppress TRACE messages at default level', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.trace('physics', 'test trace message');

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should allow WARN messages at default level', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      logger.warn('bridge', 'test warn message');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('[bridge:warn] test warn message');
      consoleSpy.mockRestore();
    });

    it('should allow ERROR messages at default level', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.error('rules', 'test error message');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('[rules:error] test error message');
      consoleSpy.mockRestore();
    });
  });

  describe('per-category override', () => {
    it('should allow DEBUG output for lifecycle category when overridden', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.configure({ categories: { lifecycle: LogLevel.DEBUG } });
      logger.debug('lifecycle', 'lifecycle debug message');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('[lifecycle:debug] lifecycle debug message');
      consoleSpy.mockRestore();
    });

    it('should still suppress DEBUG for non-overridden categories', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.configure({ categories: { lifecycle: LogLevel.DEBUG } });
      logger.debug('physics', 'physics debug message');

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should allow different levels for different categories', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      logger.configure({
        categories: {
          lifecycle: LogLevel.TRACE,
          physics: LogLevel.ERROR,
        },
      });

      logger.trace('lifecycle', 'trace message');
      logger.debug('lifecycle', 'debug message');
      logger.info('lifecycle', 'info message');

      logger.warn('physics', 'warn message');
      logger.error('physics', 'error message');

      expect(logSpy).toHaveBeenCalledTimes(3);
      expect(logSpy).toHaveBeenNthCalledWith(1, '[lifecycle:trace] trace message');
      expect(logSpy).toHaveBeenNthCalledWith(2, '[lifecycle:debug] debug message');
      expect(logSpy).toHaveBeenNthCalledWith(3, '[lifecycle:info] info message');

      expect(warnSpy).not.toHaveBeenCalled();

      logSpy.mockRestore();
      warnSpy.mockRestore();
    });
  });

  describe('configure() merging', () => {
    it('should merge new categories without losing existing overrides', () => {
      logger.configure({ categories: { lifecycle: LogLevel.DEBUG } });
      logger.configure({ categories: { physics: LogLevel.ERROR } });

      const config = logger.getConfig();

      expect(config.categories.lifecycle).toBe(LogLevel.DEBUG);
      expect(config.categories.physics).toBe(LogLevel.ERROR);
    });

    it('should update level without affecting categories', () => {
      logger.configure({ categories: { lifecycle: LogLevel.DEBUG } });
      logger.configure({ level: LogLevel.INFO });

      const config = logger.getConfig();

      expect(config.level).toBe(LogLevel.INFO);
      expect(config.categories.lifecycle).toBe(LogLevel.DEBUG);
    });

    it('should update category without affecting level', () => {
      logger.configure({ level: LogLevel.ERROR });
      logger.configure({ categories: { input: LogLevel.TRACE } });

      const config = logger.getConfig();

      expect(config.level).toBe(LogLevel.ERROR);
      expect(config.categories.input).toBe(LogLevel.TRACE);
    });

    it('should override existing category level when reconfigured', () => {
      logger.configure({ categories: { lifecycle: LogLevel.DEBUG } });
      logger.configure({ categories: { lifecycle: LogLevel.TRACE } });

      const config = logger.getConfig();

      expect(config.categories.lifecycle).toBe(LogLevel.TRACE);
    });
  });

  describe('error() and warn() at default level', () => {
    it('should output error messages at default WARN level', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.error('assets', 'asset load failed');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('[assets:error] asset load failed');
      consoleSpy.mockRestore();
    });

    it('should output warn messages at default WARN level', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      logger.warn('render', 'render warning');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('[render:warn] render warning');
      consoleSpy.mockRestore();
    });

    it('should include additional arguments in error output', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorObj = new Error('test error');

      logger.error('state', 'operation failed', errorObj, { detail: 'extra' });

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('[state:error] operation failed', errorObj, { detail: 'extra' });
      consoleSpy.mockRestore();
    });

    it('should include additional arguments in warn output', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      logger.warn('loop', 'frame dropped', { frame: 42, time: 16.7 });

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('[loop:warn] frame dropped', { frame: 42, time: 16.7 });
      consoleSpy.mockRestore();
    });
  });

  describe('getLogger singleton', () => {
    it('should return the same logger instance', () => {
      const instance1 = getLogger();
      const instance2 = getLogger();

      expect(instance1).toBe(instance2);
    });

    it('should share configuration across getLogger calls', () => {
      const instance1 = getLogger();
      instance1.configure({ level: LogLevel.DEBUG });

      const instance2 = getLogger();
      const config = instance2.getConfig();

      expect(config.level).toBe(LogLevel.DEBUG);
    });
  });

  describe('all log levels', () => {
    it('should format all log levels correctly', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.configure({ level: LogLevel.TRACE });

      logger.trace('inspector', 'trace');
      logger.debug('inspector', 'debug');
      logger.info('inspector', 'info');
      logger.warn('inspector', 'warn');
      logger.error('inspector', 'error');

      expect(logSpy).toHaveBeenNthCalledWith(1, '[inspector:trace] trace');
      expect(logSpy).toHaveBeenNthCalledWith(2, '[inspector:debug] debug');
      expect(logSpy).toHaveBeenNthCalledWith(3, '[inspector:info] info');
      expect(warnSpy).toHaveBeenCalledWith('[inspector:warn] warn');
      expect(errorSpy).toHaveBeenCalledWith('[inspector:error] error');

      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });
});
