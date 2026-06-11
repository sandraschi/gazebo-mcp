import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 60000,
    retries: 1,
    use: {
        baseURL: 'http://localhost:10990',
        headless: true,
        screenshot: 'only-on-failure',
    },
    webServer: [
        {
            command: 'uv run python -m web_sota.backend.server --port 10991',
            port: 10991,
            cwd: '../',
            timeout: 30000,
            reuseExistingServer: false,
        },
        {
            command: 'npx vite --port 10990 --host',
            port: 10990,
            cwd: '.',
            timeout: 30000,
            reuseExistingServer: false,
        },
    ],
});
