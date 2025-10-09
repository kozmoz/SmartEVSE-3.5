import {describe, it, expect} from 'vitest';
import {JSDOM} from 'jsdom';
import * as fs from 'node:fs';
import * as path from 'node:path';

async function loadPage() {
  const htmlPath = path.resolve(__dirname, '../../data/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Create a JSDOM instance with a base URL so relative paths resolve.
  const dom = new JSDOM(html, {
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
          apply() { return proxy; },
        };
        // @ts-ignore - Proxy callable object
        const proxy: any = new Proxy(function () {}, handler);
        return proxy;
      };
      const $stub: any = (..._args: any[]) => makeChain();
      $stub.ajax = () => ({ then: () => ({}) });
      // expose both $ and jQuery just in case
      // @ts-ignore
      window.$ = $stub;
      // @ts-ignore
      window.jQuery = $stub;
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
  it('navigates to /reboot when the Reboot button is clicked', async () => {
    const {document, window} = await loadPage();

    // The page uses an inline onclick="reboot()" without an id, find the button by title
    const rebootBtn = document.querySelector('button[title="Reboot your device"]');
    expect(rebootBtn).toBeTruthy();

    rebootBtn?.dispatchEvent(new window.MouseEvent('click', {bubbles: true}));

    // The reboot() function sets window.location.href = "/reboot"
    expect(window.location.href).toBe('http://device.local/reboot');
  });
});
