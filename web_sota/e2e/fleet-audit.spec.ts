import { test, expect } from '@playwright/test';

const BE = 'http://127.0.0.1:10991';
const FE = 'http://127.0.0.1:10990';

test.describe('Fleet Audit — gazebo-mcp', () => {
    test('Backend health', async ({ request }) => {
        const resp = await request.get(BE + '/health');
        expect(resp.status()).toBe(200);
    });

    test('Frontend loads', async ({ page }) => {
        await page.goto(FE, { timeout: 15000 });
        await page.waitForTimeout(3000);
        await expect(page.locator('#root')).toBeAttached();
    });

    test('No console errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(msg.text());
        });
        await page.goto(FE, { timeout: 15000 });
        await page.waitForTimeout(3000);
        expect(errors.length).toBe(0);
    });

    test('Navigation sidebar works', async ({ page }) => {
        await page.goto(FE, { timeout: 15000 });
        await page.waitForTimeout(2000);
        await expect(page.locator('nav')).toBeAttached();
        await page.locator('nav a').nth(2).click();
        await page.waitForTimeout(1000);
        await expect(page.locator('h1')).toBeAttached();
    });

    test('Dashboard loads with KPIs', async ({ page }) => {
        await page.goto(FE, { timeout: 15000 });
        await page.waitForTimeout(3000);
        await expect(page.locator('h1')).toContainText('Dashboard');
        const kpis = page.locator('.grid.grid-cols-4 > div');
        await expect(kpis).toHaveCount(4);
    });

    test('Help page has tabs', async ({ page }) => {
        await page.goto(FE + '/help', { timeout: 15000 });
        await page.waitForTimeout(2000);
        await expect(page.locator('h1')).toContainText('Help');
        const tabButtons = page.locator('button.rounded-full');
        await expect(tabButtons.first()).toBeAttached();
        await tabButtons.first().click();
        await page.waitForTimeout(500);
    });

    test('LLM page has quick actions', async ({ page }) => {
        await page.goto(FE + '/llm', { timeout: 15000 });
        await page.waitForTimeout(2000);
        await expect(page.locator('h1')).toContainText('LLM');
        const actions = page.locator('button').filter({ hasText: 'Run' });
        await expect(actions.first()).toBeAttached();
    });
});
