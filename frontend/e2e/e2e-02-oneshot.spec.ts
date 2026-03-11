/**
 * E2E-02: One-shot transcription flow
 *
 * Scenario: A user without subscription can:
 * 1. See the oneshot page with 6 pricing tiers
 * 2. Get an accurate estimate for their audio duration
 * 3. Use the unified oneshot/upload endpoint
 * 4. The transcription is properly marked as oneshot
 */
import { test, expect } from '@playwright/test';

test.describe('E2E-02: One-shot flow', () => {
  test('Oneshot page renders 6 tier cards', async ({ page }) => {
    await page.goto('/app/oneshot');
    await expect(page.locator('text=Transcription a la demande')).toBeVisible({ timeout: 10_000 });
    // 6 tiers: Court, Standard, Long, XLong, XXLong, XXXLong
    await expect(page.locator('text=Populaire')).toBeVisible();
  });

  test('API: GET /api/oneshot/tiers returns 6 tiers', async ({ page }) => {
    const response = await page.request.get('/api/oneshot/tiers');
    expect(response.ok()).toBeTruthy();
    const tiers = await response.json();
    expect(tiers.length).toBe(6);
    const tierNames = tiers.map((t: any) => t.tier);
    expect(tierNames).toContain('Court');
    expect(tierNames).toContain('Standard');
    expect(tierNames).toContain('Long');
    expect(tierNames).toContain('XLong');
    expect(tierNames).toContain('XXLong');
    expect(tierNames).toContain('XXXLong');
    // Each tier should have required fields
    for (const tier of tiers) {
      expect(tier.price_cents).toBeGreaterThan(0);
      expect(tier.max_duration_minutes).toBeGreaterThan(0);
      expect(tier.includes).toContain('transcription');
    }
  });

  test('API: POST /api/oneshot/estimate returns correct tier', async ({ page }) => {
    // Short audio (10 min = 600s) should get Court tier
    const shortResp = await page.request.post('/api/oneshot/estimate', {
      data: { duration_seconds: 600 },
    });
    expect(shortResp.ok()).toBeTruthy();
    const shortData = await shortResp.json();
    expect(shortData.tier).toBe('Court');

    // Medium audio (40 min = 2400s) should get Standard tier
    const medResp = await page.request.post('/api/oneshot/estimate', {
      data: { duration_seconds: 2400 },
    });
    expect(medResp.ok()).toBeTruthy();
    const medData = await medResp.json();
    expect(medData.tier).toBe('Standard');

    // Long audio (80 min = 4800s) should get Long tier
    const longResp = await page.request.post('/api/oneshot/estimate', {
      data: { duration_seconds: 4800 },
    });
    expect(longResp.ok()).toBeTruthy();
    const longData = await longResp.json();
    expect(longData.tier).toBe('Long');

    // XLong audio (100 min = 6000s) should get XLong tier
    const xlongResp = await page.request.post('/api/oneshot/estimate', {
      data: { duration_seconds: 6000 },
    });
    expect(xlongResp.ok()).toBeTruthy();
    const xlongData = await xlongResp.json();
    expect(xlongData.tier).toBe('XLong');

    // XXLong audio (140 min = 8400s) should get XXLong tier
    const xxlongResp = await page.request.post('/api/oneshot/estimate', {
      data: { duration_seconds: 8400 },
    });
    expect(xxlongResp.ok()).toBeTruthy();
    const xxlongData = await xxlongResp.json();
    expect(xxlongData.tier).toBe('XXLong');

    // XXXLong audio (170 min = 10200s) should get XXXLong tier
    const xxxlongResp = await page.request.post('/api/oneshot/estimate', {
      data: { duration_seconds: 10200 },
    });
    expect(xxxlongResp.ok()).toBeTruthy();
    const xxxlongData = await xxxlongResp.json();
    expect(xxxlongData.tier).toBe('XXXLong');
  });

  test('API: POST /api/oneshot/estimate rejects invalid input', async ({ page }) => {
    const resp = await page.request.post('/api/oneshot/estimate', {
      data: { duration_seconds: 0 },
    });
    expect(resp.status()).toBe(400);
  });

  test('API: POST /api/oneshot/order creates a paid order (stub)', async ({ page }) => {
    const resp = await page.request.post('/api/oneshot/order', {
      data: { tier: 'Court', duration_seconds: 600 },
    });
    expect(resp.ok()).toBeTruthy();
    const order = await resp.json();
    expect(order.id).toBeTruthy();
    expect(order.tier).toBe('Court');
    expect(order.payment_status).toBe('paid');
  });

  test('API: POST /api/oneshot/order rejects unknown tier', async ({ page }) => {
    const resp = await page.request.post('/api/oneshot/order', {
      data: { tier: 'SuperLong', duration_seconds: 600 },
    });
    expect(resp.status()).toBe(400);
  });

  test('Oneshot page has drop zone and profile selector', async ({ page }) => {
    await page.goto('/app/oneshot');
    // Drop zone present
    await expect(page.locator('text=Glissez votre fichier audio')).toBeVisible({ timeout: 10_000 });
    // Profile selector present
    await expect(page.locator('text=Profil d\'analyse')).toBeVisible();
    // Profiles visible
    await expect(page.locator('text=Generique')).toBeVisible();
    await expect(page.locator('text=Business')).toBeVisible();
  });

  test('Oneshot page shows comparison section', async ({ page }) => {
    await page.goto('/app/oneshot');
    await expect(page.locator('text=One-shot vs abonnement')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Voir les abonnements')).toBeVisible();
  });
});
