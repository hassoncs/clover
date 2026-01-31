import { describe, it, expect, beforeEach } from 'vitest';
import { QuickJSSandbox } from './QuickJSSandbox';

function isSuccess(result: { success: boolean }): result is { success: true; value: unknown } {
  return result.success === true;
}

function isFailure(result: { success: boolean }): result is { success: false; error: { message: string; type: string } } {
  return result.success === false;
}

describe('QuickJSSandbox', () => {
  let sandbox: QuickJSSandbox;

  beforeEach(() => {
    sandbox = new QuickJSSandbox({ maxExecutionTimeMs: 1000 });
  });

  it('should evaluate simple arithmetic', async () => {
    const result = await sandbox.evaluate('1 + 1');
    expect(result.success).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe(2);
    }
  });

  it('should evaluate string operations', async () => {
    const result = await sandbox.evaluate('"hello" + " " + "world"');
    expect(result.success).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe('hello world');
    }
  });

  it('should catch syntax errors', async () => {
    const result = await sandbox.evaluate('const x = }');
    expect(result.success).toBe(false);
    if (isFailure(result)) {
      expect(result.error).toBeDefined();
      expect(result.error.type).toBe('syntax');
    }
  });

  it('should terminate infinite loops', async () => {
    const tightSandbox = new QuickJSSandbox({ maxExecutionTimeMs: 10, maxInstructions: 1000 });
    const result = await tightSandbox.evaluate('while(true) {}');
    expect(result.success).toBe(false);
    if (isFailure(result)) {
      expect(result.error).toBeDefined();
      expect(result.error.type).toBe('timeout');
    }
    tightSandbox.dispose();
  });

  it('should handle undefined return values', async () => {
    const result = await sandbox.evaluate('const x = 5');
    expect(result.success).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBeUndefined();
    }
  });

  it('should evaluate objects correctly', async () => {
    const result = await sandbox.evaluate('({ a: 1, b: 2 })');
    expect(result.success).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toEqual({ a: 1, b: 2 });
    }
  });

  it('should catch runtime errors', async () => {
    const result = await sandbox.evaluate('throw new Error("test error")');
    expect(result.success).toBe(false);
    if (isFailure(result)) {
      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('test error');
    }
  });

  it('should pass context variables to script', async () => {
    const result = await sandbox.evaluate('ctx.x + ctx.y', { x: 10, y: 20 });
    expect(result.success).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe(30);
    }
  });

  it('should dispose resources correctly', async () => {
    await sandbox.evaluate('1 + 1');
    sandbox.dispose();
    const result = await sandbox.evaluate('1 + 1');
    expect(result.success).toBe(false);
    if (isFailure(result)) {
      expect(result.error.message).toContain('disposed');
    }
  });
});
