import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../EventBus';

describe('EventBus', () => {
  it('should emit events to listeners', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('test', handler);
    bus.emit('test', { value: 42 });

    expect(handler).toHaveBeenCalledWith({ value: 42 });
  });

  it('should support multiple listeners for same event', () => {
    const bus = new EventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.on('test', handler1);
    bus.on('test', handler2);
    bus.emit('test', 'data');

    expect(handler1).toHaveBeenCalledWith('data');
    expect(handler2).toHaveBeenCalledWith('data');
  });

  it('should unsubscribe via returned function', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    const unsub = bus.on('test', handler);
    unsub();
    bus.emit('test', 'data');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should unsubscribe via off()', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('test', handler);
    bus.off('test', handler);
    bus.emit('test', 'data');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should not error when emitting to no listeners', () => {
    const bus = new EventBus();
    expect(() => bus.emit('nonexistent', 'data')).not.toThrow();
  });

  it('should clear all listeners', () => {
    const bus = new EventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.on('event1', handler1);
    bus.on('event2', handler2);
    bus.clear();
    bus.emit('event1', 'data');
    bus.emit('event2', 'data');

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  it('should pass undefined when emit called without data', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('test', handler);
    bus.emit('test');

    expect(handler).toHaveBeenCalledWith(undefined);
  });
});
