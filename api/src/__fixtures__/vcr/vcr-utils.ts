import { fetchMock } from 'cloudflare:test';

export interface CassetteMetadata {
  recordedAt: string;
  model: string;
  baseURL: string;
  prompt?: string;
}

export interface CassetteRequest {
  method: string;
  url: string;
  bodyHash?: string;
}

export interface CassetteResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface Cassette {
  metadata: CassetteMetadata;
  request: CassetteRequest;
  response: CassetteResponse;
}

export function setupVCR(): void {
  fetchMock.activate();
  fetchMock.disableNetConnect();
}

export function teardownVCR(): void {
  fetchMock.assertNoPendingInterceptors();
  fetchMock.deactivate();
}

export function loadCassette(cassette: Cassette): void {
  const url = new URL(cassette.request.url);
  
  fetchMock
    .get(url.origin)
    .intercept({
      method: cassette.request.method,
      path: url.pathname,
    })
    .reply(
      cassette.response.status,
      cassette.response.body as object,
      { headers: cassette.response.headers }
    );
}

export function loadCassettes(cassettes: Cassette[]): void {
  for (const cassette of cassettes) {
    loadCassette(cassette);
  }
}

export function mockOpenRouterResponse(responseBody: object): void {
  fetchMock
    .get('https://openrouter.ai')
    .intercept({
      method: 'POST',
      path: '/api/v1/chat/completions',
    })
    .reply(200, responseBody, {
      headers: { 'content-type': 'application/json' },
    });
}

export function mockScenarioResponse(responseBody: object): void {
  fetchMock
    .get('https://api.cloud.scenario.com')
    .intercept({
      method: 'POST',
      path: /\/v1\/.*/,
    })
    .reply(200, responseBody, {
      headers: { 'content-type': 'application/json' },
    });
}
