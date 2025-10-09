import {vi} from 'vitest';

// Stub location.reload for jsdom
Object.defineProperty(window, 'location', {
    value: {...window.location, reload: vi.fn()},
});

// Polyfill `Response` for JSDOM
if (!global.Response ) {
    const {Response} = require('whatwg-fetch');
    global.Response = class extends Response {};
}

