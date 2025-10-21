import {vi} from 'vitest';

// Stub location.reload for jsdom
Object.defineProperty(window, 'location', {
    value: {...window.location, reload: vi.fn()},
});

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
