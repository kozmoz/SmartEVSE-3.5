import {describe, it, expect} from 'vitest';
import {loadPage} from './setup';
import userEvent from '@testing-library/user-event'
import {getByLabelText, getByText} from "@testing-library/dom";

describe('ESP32 /data/index.html reboot UI (integration via JSDOM)', () => {
    it('invokes reboot flow and shows a status message when Reboot is clicked', async () => {

        // Setup userEvent for simulating user interactions.
        const user = userEvent.setup();

        // Render the page.
        const {document} = await loadPage();

        // The page uses an-<a> link with onclick="reboot(event)" and a title.
        const rebootBtn: any = Array.from(document.querySelectorAll('a'))
            .find((a: HTMLLinkElement) => a.textContent === 'Reboot');
        expect(rebootBtn).toBeTruthy();

        // equivalent of: rebootBtn?.dispatchEvent(new window.MouseEvent('click', {bubbles: true}));
        await user.click(rebootBtn);

        // The reboot() function fetches "/reboot" and shows a message div
        const msg = document.querySelector('#rebootMsg');
        expect(msg).toBeTruthy();
        expect(msg.innerText).toContain('Device will reboot in 5 seconds...');
    });
});
