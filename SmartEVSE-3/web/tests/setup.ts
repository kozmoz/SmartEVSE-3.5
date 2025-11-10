import {vi} from 'vitest';
import {JSDOM} from 'jsdom';
import * as fs from 'node:fs';
import * as path from 'node:path';

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
}


// Exported helper to load the /data/index.html page into JSDOM for integration tests
export async function loadPage() {
    const htmlPath = path.resolve(__dirname, '../../data/index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // Strip external resources (CSS/JS) which JSDOM would try to load over network
    const sanitizedHtml = html
        // remove all <link ...> tags (CSS not needed for logic)
        .replace(/<link[^>]*>/g, '')
        // remove external script tags (keep inline scripts)
        .replace(/<script[^>]+src="https?:\/\/[^"]+"[^>]*><\/script>/g, '');

    // Create a JSDOM instance with a base URL so relative paths resolve.
    const dom = new JSDOM(sanitizedHtml, {
        url: 'http://device.local/',
        runScripts: 'dangerously',
        resources: 'usable',
        pretendToBeVisual: true,
        beforeParse(window: any): void {
            // Provide a minimal jQuery stub so inline scripts that reference $ don't crash
            const makeChain = () => {
                const handler: any = {
                    get(_t: any, prop: string) {
                        // Avoid it being treated as a Promise.
                        if (prop === 'then') {
                            return undefined;
                        }
                        // chainable no-op
                        return (..._args: any[]) => {
                            return proxy;
                        };
                    },
                    apply() {
                        return proxy;
                    },
                };
                // @ts-ignore - Proxy callable object
                const proxy: any = new Proxy(function () {
                }, handler);
                return proxy;
            };
            const $stub: any = (..._args: any[]) => makeChain();
            $stub.ajax = () => ({then: () => ({})});
            // expose both $ and jQuery just in case
            // @ts-ignore
            window.$ = $stub;
            // @ts-ignore
            window.jQuery = $stub;

            // Also stub URL.createObjectURL/URL.revokeObjectURL inside the page window
            window.URL = window.URL || ({} as any);
            if (typeof window.URL.createObjectURL !== 'function') {
                window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
            }
            if (typeof window.URL.revokeObjectURL !== 'function') {
                window.URL.revokeObjectURL = vi.fn();
            }

            const defaultResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                text: async () => '',
                json: async () => ({}),
                blob: async () => new Blob(['']),
            } as const;

            window.fetch = vi.fn(async (input?: any, _init?: any) => {
                const url = typeof input === 'string' ? input : (input?.url ?? '');
                if (typeof url === 'string' && url.endsWith('/reboot')) {
                    return {
                        ...defaultResponse,
                        text: async () => 'Device will reboot in 5 seconds...',
                    } as any;
                }
                return {...defaultResponse} as any;
            });

            // Do not redefine window.location here; jsdom defines it as non-configurable.
            // The app may call location.reload; stub it if present.
            if (typeof window.location.reload !== 'function') {
                window.location.reload = vi.fn();
            }
        },
    });

    const {window} = dom;

    // Wait until DOM is ready (scripts may attach handlers inline via onclick)
    await new Promise<void>((resolve) => {
        if (window.document.readyState === 'complete' || window.document.readyState === 'interactive') {
            setImmediate(() => resolve());
        } else {
            window.addEventListener('DOMContentLoaded', () => setImmediate(() => resolve()));
        }
    });

    return {dom, window, document: window.document};
}
