import test from 'node:test';
import assert from 'node:assert/strict';
import { apiClient } from './apiClient';

test('apiClient: returns error result when VITE_API_BASE_URL is missing', async () => {
  const originalEnv = process.env.VITE_API_BASE_URL;
  delete process.env.VITE_API_BASE_URL;

  let fetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    return new Response(JSON.stringify({ success: true }));
  }) as any;

  try {
    const res = await apiClient.solveDijkstra({
      graph: { nodes: ['S', 'F'], edges: [{ from: 'S', to: 'F', weight: 5 }] },
      source: 'S',
      destination: 'F',
      include_trace: false,
    });

    assert.equal(fetchCalled, false);
    assert.equal(res.success, false);
    if (!res.success) {
      assert.equal(res.error.message, 'API URL not set');
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnv !== undefined) {
      process.env.VITE_API_BASE_URL = originalEnv;
    }
  }
});

test('apiClient: handles successful algorithm response', async () => {
  const originalEnv = process.env.VITE_API_BASE_URL;
  process.env.VITE_API_BASE_URL = 'http://127.0.0.1:8000';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: any) => {
    assert.equal(url, 'http://127.0.0.1:8000/api/dijkstra');
    assert.equal(init.method, 'POST');
    return new Response(
      JSON.stringify({
        success: true,
        algorithm: 'dijkstra',
        reachable: true,
        path: ['S', 'A', 'F'],
        total_cost: 5,
        trace: [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as any;

  try {
    const res = await apiClient.solveDijkstra({
      graph: { nodes: ['S', 'A', 'F'], edges: [{ from: 'S', to: 'A', weight: 2 }, { from: 'A', to: 'F', weight: 3 }] },
      source: 'S',
      destination: 'F',
      include_trace: false,
    });

    assert.equal(res.success, true);
    if (res.success) {
      assert.deepEqual(res.path, ['S', 'A', 'F']);
      assert.equal(res.total_cost, 5);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnv !== undefined) {
      process.env.VITE_API_BASE_URL = originalEnv;
    } else {
      delete process.env.VITE_API_BASE_URL;
    }
  }
});

test('apiClient: returns error message on server error response', async () => {
  const originalEnv = process.env.VITE_API_BASE_URL;
  process.env.VITE_API_BASE_URL = 'http://127.0.0.1:8000';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INVALID_GRAPH',
          message: 'A blocked edge does not match any edge in edges.',
          details: [],
          request_id: 'err-123',
        },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }) as any;

  try {
    const res = await apiClient.solveDijkstra({
      graph: { nodes: ['S', 'F'], edges: [{ from: 'S', to: 'F', weight: 2 }] },
      source: 'S',
      destination: 'F',
      include_trace: false,
    });

    assert.equal(res.success, false);
    if (!res.success) {
      assert.equal(res.error.code, 'INVALID_GRAPH');
      assert.equal(res.error.message, 'A blocked edge does not match any edge in edges.');
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnv !== undefined) {
      process.env.VITE_API_BASE_URL = originalEnv;
    } else {
      delete process.env.VITE_API_BASE_URL;
    }
  }
});

test('apiClient: handles timeout with AbortController error', async () => {
  const originalEnv = process.env.VITE_API_BASE_URL;
  process.env.VITE_API_BASE_URL = 'http://127.0.0.1:8000';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';
    throw abortErr;
  }) as any;

  try {
    const res = await apiClient.solveKnapsack({
      budget: 10,
      coins: [{ id: 'c1', cost: 2, value: 5 }],
      include_trace: true,
    });

    assert.equal(res.success, false);
    if (!res.success) {
      assert.equal(res.error.code, 'TIMEOUT');
      assert.equal(res.error.message, 'Request timed out after 8 seconds');
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnv !== undefined) {
      process.env.VITE_API_BASE_URL = originalEnv;
    } else {
      delete process.env.VITE_API_BASE_URL;
    }
  }
});
