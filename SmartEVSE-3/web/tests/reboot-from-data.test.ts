import {describe, it, expect} from 'vitest';
import {loadPage} from './setup';

describe('ESP32 /data/index.html reboot UI (integration via JSDOM)', () => {
    it('invokes reboot flow and shows a status message when Reboot is clicked', async () => {

        const {document, window} = await loadPage();

        // The page uses an-<a> link with onclick="reboot(event)" and a title.
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
    });
});
