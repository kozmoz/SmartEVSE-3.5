import {describe, it, expect} from 'vitest';
import {JSDOM} from 'jsdom';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {vi} from 'vitest';

async function loadPage() {
    const htmlPath = path.resolve(__dirname, '../../data/index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // Strip external resources (CSS/JS) which JSDOM would try to load over network
    const sanitizedHtml = html
        // remove all <link ...> tags (CSS not needed for logic)
        .replace(/<link[^>]*>/g, '')
        // remove external script tags (keep inline scripts)
        .replace(/<script[^>]+src="https?:\/\/[^\"]+"[^>]*><\/script>/g, '');

    // Create a JSDOM instance with a base URL so relative paths resolve.
    const dom = new JSDOM(sanitizedHtml, {
        url: 'http://device.local/',
        runScripts: 'dangerously',
        resources: 'usable',
        pretendToBeVisual: true,
        beforeParse(window) {
            // Provide a minimal jQuery stub so inline scripts that reference $ don't crash
            const makeChain = () => {
                const handler: any = {
                    get(_t: any, prop: string) {
                        if (prop === 'then') return undefined; // avoid being treated as a Promise
                        return (..._args: any[]) => proxy; // chainable no-op
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

            // Install a fetch mock on the JSDOM window before any inline scripts run

            // Also stub URL.createObjectURL/URL.revokeObjectURL inside the page window
            try {
                // @ts-ignore
                window.URL = window.URL || ({} as any);
                // @ts-ignore
                if (typeof window.URL.createObjectURL !== 'function') {
                    // @ts-ignore
                    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
                }
                // @ts-ignore
                if (typeof window.URL.revokeObjectURL !== 'function') {
                    // @ts-ignore
                    window.URL.revokeObjectURL = vi.fn();
                }
            } catch (_) {
                // ignore if not writable
            }
            const defaultResponse = {
                ok: true,
                status: 200,
                statusText: 'OK',
                text: async () => '',
                json: async () => ({}),
                blob: async () => new Blob(['']),
            } as const;
            // @ts-ignore
            window.fetch = vi.fn(async (input?: any, _init?: any) => {
                const url = typeof input === 'string' ? input : (input?.url ?? '');
                if (typeof url === 'string' && url.endsWith('/reboot')) {
                    return {
                        ...defaultResponse,
                        text: async () => 'Device will reboot in 5 seconds...',
                    } as any;
                }
                return { ...defaultResponse } as any;
            });

            // Do not redefine window.location here; jsdom defines it as non-configurable.
            // The app may call location.reload; stub it if present.
            try {
                if (typeof window.location.reload !== 'function') {
                    // @ts-ignore
                    window.location.reload = vi.fn();
                }
            } catch (_) {
                // ignore if not writable
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

describe('ESP32 /data/index.html reboot UI (integration via JSDOM)', () => {
    it('invokes reboot flow and shows a status message when Reboot is clicked', async () => {

        // Provide a minimal fetch mock so inline scripts using fetch don't crash in JSDOM
        const mockFetch = vi.fn(async (_input?: any, _init?: any) => {
            return {
                status: 200,
                text: async () => 'Device will reboot in 5 seconds...'
            };
        });

        const {document} = await loadPage();

        // The page uses an <a> link with onclick="reboot(event)" and a title.
        const rebootBtn = document.querySelector('a[title="Reboot your device"]');
        expect(rebootBtn).toBeTruthy();

        rebootBtn?.dispatchEvent(new window.MouseEvent('click', {bubbles: true}));

        // Wait a couple of ticks for the fetch promise chain to run
        await new Promise((r) => setImmediate(r));
        await new Promise((r) => setTimeout(r, 0));

        // The reboot() function fetches "/reboot" and shows a message div
        const msg = document.querySelector('#rebootMsg');
        expect(msg).toBeTruthy();
        expect(msg.innerText).toContain('Device will reboot in 5 seconds...');
        console.log('==== MSG: ' + msg?.innerText);
    });
});
