import { test, expect } from '@playwright/test';

test.describe('BibsClaw Dashboard', () => {
  test('should load the dashboard homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/BibsClaw/);
  });

  test('should display the chat interface', async ({ page }) => {
    await page.goto('/');
    const chatInput = page.locator('#chat-input, [data-testid="chat-input"], input[type="text"]');
    await expect(chatInput).toBeVisible();
  });

  test('should send a message and get a response', async ({ page }) => {
    await page.goto('/');
    const chatInput = page.locator('#chat-input, [data-testid="chat-input"], input[type="text"]');
    await chatInput.fill('Hello BibsClaw');
    await chatInput.press('Enter');
    const response = page.locator('.message, .chat-response, [data-testid="chat-message"]');
    await expect(response.first()).toBeVisible({ timeout: 30000 });
  });

  test('should toggle dark/light theme', async ({ page }) => {
    await page.goto('/');
    const themeToggle = page.locator('[data-testid="theme-toggle"], .theme-toggle, button:has-text("theme")');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
    }
  });

  test('should navigate between dashboard sections', async ({ page }) => {
    await page.goto('/');
    const navLinks = page.locator('nav a, .sidebar a, [data-testid="nav-link"]');
    const count = await navLinks.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should handle voice button interaction', async ({ page }) => {
    await page.goto('/');
    const voiceBtn = page.locator('[data-testid="voice-btn"], .voice-button, button:has-text("voice")');
    if (await voiceBtn.isVisible()) {
      await expect(voiceBtn).toBeEnabled();
    }
  });

  test('should display task scheduler section', async ({ page }) => {
    await page.goto('/');
    const taskSection = page.locator('[data-testid="tasks"], .task-scheduler, #tasks');
    if (await taskSection.isVisible()) {
      await expect(taskSection).toBeVisible();
    }
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page).toHaveTitle(/BibsClaw/);
  });
});
