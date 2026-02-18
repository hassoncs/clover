import { describe, it, expect, vi } from 'vitest';
import { EventQueueImpl } from '../EventQueue';

describe('EventQueue', () => {
  it('should queue events and deliver on next frame', () => {
    const queue = new EventQueueImpl();
    const handler = vi.fn();

    queue.subscribe('test-event', handler);
    queue.emit('test-event', { value: 42 });

    expect(handler).not.toHaveBeenCalled();

    queue.flush();

    expect(handler).toHaveBeenCalledWith({ value: 42 });
  });

  it('should deliver multiple events in order', () => {
    const queue = new EventQueueImpl();
    const calls: number[] = [];

    queue.subscribe('event', (data) => calls.push(data as number));

    queue.emit('event', 1);
    queue.emit('event', 2);
    queue.emit('event', 3);

    queue.flush();

    expect(calls).toEqual([1, 2, 3]);
  });

  it('should support multiple subscribers', () => {
    const queue = new EventQueueImpl();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    queue.subscribe('event', handler1);
    queue.subscribe('event', handler2);

    queue.emit('event', 'data');
    queue.flush();

    expect(handler1).toHaveBeenCalledWith('data');
    expect(handler2).toHaveBeenCalledWith('data');
  });

  it('should unsubscribe handlers', () => {
    const queue = new EventQueueImpl();
    const handler = vi.fn();

    const unsubscribe = queue.subscribe('event', handler);
    unsubscribe();

    queue.emit('event', 'data');
    queue.flush();

    expect(handler).not.toHaveBeenCalled();
  });

  it('should clear queue and listeners', () => {
    const queue = new EventQueueImpl();
    const handler = vi.fn();

    queue.subscribe('event', handler);
    queue.emit('event', 'data');

    queue.clear();
    queue.flush();

    expect(handler).not.toHaveBeenCalled();
  });

  it('should return flushed events', () => {
    const queue = new EventQueueImpl();

    queue.emit('event1', 'data1');
    queue.emit('event2', 'data2');

    const events = queue.flush();

    expect(events).toEqual([
      { event: 'event1', data: 'data1' },
      { event: 'event2', data: 'data2' },
    ]);
  });

  it('should clear queue after flush', () => {
    const queue = new EventQueueImpl();

    queue.emit('event', 'data');
    queue.flush();

    const events = queue.flush();
    expect(events).toEqual([]);
  });
});
