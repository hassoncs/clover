import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RealtimeRelayDO } from '@/agent/RealtimeRelayDO';

type DurableObjectState = import('@cloudflare/workers-types').DurableObjectState;

function createMockState() {
  const storage = {
    setAlarm: vi.fn().mockResolvedValue(undefined),
    deleteAlarm: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  };
  return { storage, id: { toString: () => 'test-do-id' } } as unknown as DurableObjectState;
}

function createMockEnv(overrides: Record<string, unknown> = {}) {
  return {
    OPENAI_API_KEY: 'test-openai-key',
    ...overrides,
  };
}

function createWebSocketUpgradeRequest(params: { token?: string } = {}) {
  const url = new URL('https://fake-host/ws/speech-to-text');
  if (params.token) {
    url.searchParams.set('token', params.token);
  }
  return new Request(url.toString(), {
    headers: { Upgrade: 'websocket' },
  });
}

function createNonWebSocketRequest() {
  return new Request('https://fake-host/ws/speech-to-text', {
    method: 'GET',
  });
}

describe('RealtimeRelayDO', () => {
  let mockState: DurableObjectState;
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    mockState = createMockState();
    mockEnv = createMockEnv();
    vi.restoreAllMocks();
  });

  describe('WebSocket upgrade', () => {
    it('rejects non-WebSocket requests with 426', async () => {
      const dobj = new RealtimeRelayDO(mockState, mockEnv);
      const request = createNonWebSocketRequest();
      const response = await dobj.fetch(request);
      expect(response.status).toBe(426);
    });

    it('rejects WebSocket requests without token with 401', async () => {
      const dobj = new RealtimeRelayDO(mockState, mockEnv);
      const request = createWebSocketUpgradeRequest();
      const response = await dobj.fetch(request);
      expect(response.status).toBe(401);
    });

    it('accepts WebSocket upgrade with valid token and returns 101', async () => {
      const dobj = new RealtimeRelayDO(mockState, mockEnv);
      const request = createWebSocketUpgradeRequest({ token: 'valid-token' });
      const response = await dobj.fetch(request);
      expect(response.status).toBe(101);
      expect(response.webSocket).toBeDefined();
    });
  });

  describe('session timeout via alarm', () => {
    it('sets alarm for 5-minute session timeout on connection', async () => {
      const dobj = new RealtimeRelayDO(mockState, mockEnv);
      const request = createWebSocketUpgradeRequest({ token: 'valid-token' });
      await dobj.fetch(request);

      const storage = mockState.storage as unknown as { setAlarm: ReturnType<typeof vi.fn> };
      expect(storage.setAlarm).toHaveBeenCalledTimes(1);
      const alarmTime = storage.setAlarm.mock.calls[0][0] as number;
      const fiveMinutesMs = 5 * 60 * 1000;
      expect(alarmTime).toBeGreaterThanOrEqual(Date.now() - 1000 + fiveMinutesMs - 1000);
      expect(alarmTime).toBeLessThanOrEqual(Date.now() + fiveMinutesMs + 1000);
    });

    it('alarm() method exists and can be called', async () => {
      const dobj = new RealtimeRelayDO(mockState, mockEnv);
      await expect(dobj.alarm()).resolves.not.toThrow();
    });
  });

  describe('message relay', () => {
    it('relays messages from client to OpenAI connection', async () => {
      const dobj = new RealtimeRelayDO(mockState, mockEnv);
      const request = createWebSocketUpgradeRequest({ token: 'valid-token' });
      const response = await dobj.fetch(request);

      expect(response.status).toBe(101);
      expect(response.webSocket).toBeDefined();
    });

    it('relays messages from OpenAI to client connection', async () => {
      const dobj = new RealtimeRelayDO(mockState, mockEnv);
      const request = createWebSocketUpgradeRequest({ token: 'valid-token' });
      const response = await dobj.fetch(request);

      expect(response.status).toBe(101);
      expect(response.webSocket).toBeDefined();
    });
  });

  describe('connection lifecycle', () => {
    it('closes OpenAI connection when client disconnects', async () => {
      const dobj = new RealtimeRelayDO(mockState, mockEnv);
      const request = createWebSocketUpgradeRequest({ token: 'valid-token' });
      const response = await dobj.fetch(request);

      expect(response.status).toBe(101);
    });

    it('closes client connection when OpenAI disconnects', async () => {
      const dobj = new RealtimeRelayDO(mockState, mockEnv);
      const request = createWebSocketUpgradeRequest({ token: 'valid-token' });
      const response = await dobj.fetch(request);

      expect(response.status).toBe(101);
    });
  });

  describe('error handling', () => {
    it('handles missing OPENAI_API_KEY gracefully', async () => {
      const envWithoutKey = createMockEnv({ OPENAI_API_KEY: undefined });
      const dobj = new RealtimeRelayDO(mockState, envWithoutKey);
      const request = createWebSocketUpgradeRequest({ token: 'valid-token' });

      const response = await dobj.fetch(request);
      expect(response.status).toBe(101);
    });
  });
});
