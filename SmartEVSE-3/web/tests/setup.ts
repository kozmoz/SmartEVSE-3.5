import {vi} from 'vitest';

console.log('==== setup.ts');

// Stub location.reload for jsdom
Object.defineProperty(window, 'location', {
    value: {...window.location, reload: vi.fn()},
});

// Stub URL.createObjectURL/URL.revokeObjectURL for jsdom (used for blobs/images)
try {
    // @ts-ignore
    if (typeof URL.createObjectURL !== 'function') {
        // @ts-ignore
        URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    }
    // @ts-ignore
    if (typeof URL.revokeObjectURL !== 'function') {
        // @ts-ignore
        URL.revokeObjectURL = vi.fn();
    }
} catch (_e) {
    // ignore if URL is not writable
}

// Provide a safe default mock for fetch in the JSDOM test environment
if (!('fetch' in globalThis)) {
    // Minimal Response-like object used by our tests/pages
    const defaultResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => '',
        json: async () => ({}),
        // Provide a minimal blob() for code paths that expect images/binary
        blob: async () => new Blob(['']),
    } as const;

    // Use vi.fn so tests can assert on calls if needed
    (globalThis as any).fetch = vi.fn(async (_input?: any, _init?: any) => ({
        ...defaultResponse,
    }));

    console.log('==== setup.ts: installed globalThis.fetch mock');
}

// Polyfill `Response` for JSDOM if not present
/*
if (!(global as any).Response) {
    try {
        const {Response} = require('whatwg-fetch');
        (global as any).Response = class extends Response {};
    } catch (_e) {
        // no-op; our mock above doesn't rely on Response
    }
}
*/
