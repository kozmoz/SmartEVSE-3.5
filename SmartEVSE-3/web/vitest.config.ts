import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // We'll spin up our own JSDOM so default env can stay "node"
        // environment: 'node',
        environment: 'jsdom',       // simulate browser DOM
        setupFiles: ['tests/setup.ts'],
        restoreMocks: true,
        fakeTimers: { toFake: ['setTimeout', 'clearTimeout'] }
    }
});
