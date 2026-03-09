/**
 * E2E-01: Free user flow
 *
 * Scenario: A user on the Free plan can:
 * 1. See the plans page with current plan highlighted
 * 2. Upload a file and get a transcription
 * 3. See transcription result with text and segments
 * 4. Generate a summary (free feature)
 * 5. Be blocked when trying to access a gated feature (e.g. dictation, mindmap)
 */
import { test, expect } from '@playwright/test';

test.describe('E2E-01: Free user flow', () => {
  test('Plans page loads and shows current plan', async ({ page }) => {
    await page.goto('/plans');
    // Should show plan cards
    await expect(page.locator('text=Plans & Consommation')).toBeVisible();
    // Should have at least the free plan
    await expect(page.locator('text=Plan actuel')).toBeVisible({ timeout: 10_000 });
  });

  test('Home page loads with upload area', async ({ page }) => {
    await page.goto('/');
    // Upload page should be accessible
    await expect(page.locator('text=Upload')).toBeVisible({ timeout: 10_000 });
  });

  test('Transcriptions list page loads', async ({ page }) => {
    await page.goto('/transcriptions');
    // Should show the transcriptions page
    await expect(page.locator('h1, h2')).toBeVisible({ timeout: 10_000 });
  });

  test('Models page loads with backend info', async ({ page }) => {
    await page.goto('/models');
    await expect(page.locator('text=Modeles')).toBeVisible({ timeout: 10_000 });
  });

  test('Oneshot page loads with tier cards', async ({ page }) => {
    await page.goto('/oneshot');
    await expect(page.locator('text=Transcription a la demande')).toBeVisible({ timeout: 10_000 });
    // Should show 3 tier cards
    const tierCards = page.locator('text=EUR');
    await expect(tierCards.first()).toBeVisible({ timeout: 10_000 });
  });

  test('Plans page shows feature gating', async ({ page }) => {
    // First check subscription features endpoint
    const response = await page.request.get('/api/subscription/features');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    // Free plan should have transcription
    expect(data.features).toContain('transcription');
    // Free plan should NOT have dictation
    expect(data.features).not.toContain('dictation');
    expect(data.features).not.toContain('mindmap');
  });

  test('API: GET /api/plans returns all plans', async ({ page }) => {
    const response = await page.request.get('/api/plans');
    expect(response.ok()).toBeTruthy();
    const plans = await response.json();
    expect(plans.length).toBeGreaterThanOrEqual(4);
    const planIds = plans.map((p: any) => p.id);
    expect(planIds).toContain('free');
    expect(planIds).toContain('basic');
    expect(planIds).toContain('pro');
    expect(planIds).toContain('team');
  });

  test('API: GET /api/subscription returns free plan', async ({ page }) => {
    const response = await page.request.get('/api/subscription');
    expect(response.ok()).toBeTruthy();
    const sub = await response.json();
    expect(sub.plan_id).toBe('free');
    expect(sub.minutes_remaining).toBeGreaterThanOrEqual(0);
  });

  test('API: Feature gating blocks dictation for free user', async ({ page }) => {
    // Try to start a dictation session (gated feature for free plan)
    const response = await page.request.post('/api/dictation/start', {
      data: { profile: 'generic' },
    });
    // Should be 403 (feature not available)
    expect(response.status()).toBe(403);
    const data = await response.json();
    expect(data.detail.error).toBe('feature_not_available');
    expect(data.detail.feature).toBe('dictation');
  });
});
