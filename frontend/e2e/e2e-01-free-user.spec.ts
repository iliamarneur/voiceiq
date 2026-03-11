/**
 * E2E-01: Nouvel inscrit sans abonnement
 *
 * Scenario: Un utilisateur s'inscrit, n'a aucun plan actif.
 * 1. Il est redirige vers /app/plans pour choisir un abonnement
 * 2. La page plans affiche 3 offres : basic, pro, team (pas de free)
 * 3. Le feature gating bloque toutes les fonctionnalites (aucun plan = aucune feature)
 * 4. L'API /api/subscription retourne null/vide ou 404 (pas de souscription)
 * 5. La page d'accueil / affiche le one-shot simple (public, sans auth)
 */
import { test, expect } from '@playwright/test';

test.describe('E2E-01: New user without subscription', () => {
  test('Plans page loads and shows 3 plans (no free plan)', async ({ page }) => {
    await page.goto('/app/plans');
    await expect(page.locator('text=Plans & Consommation')).toBeVisible({ timeout: 10_000 });
    // Should show 3 plan cards: basic, pro, team
    const planCards = page.locator('[data-testid="plan-card"]');
    await expect(planCards).toHaveCount(3);
  });

  test('Home page loads with dashboard', async ({ page }) => {
    await page.goto('/app');
    // Dashboard should be accessible
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10_000 });
  });

  test('Feature gating returns empty features (no plan)', async ({ page }) => {
    const response = await page.request.get('/api/subscription/features');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    // No plan = no features
    expect(data.features).toEqual([]);
  });

  test('API: GET /api/plans returns exactly 3 plans', async ({ page }) => {
    const response = await page.request.get('/api/plans');
    expect(response.ok()).toBeTruthy();
    const plans = await response.json();
    expect(plans.length).toBe(3);
    const planIds = plans.map((p: any) => p.id);
    expect(planIds).toContain('basic');
    expect(planIds).toContain('pro');
    expect(planIds).toContain('team');
    expect(planIds).not.toContain('free');
  });

  test('API: GET /api/subscription returns null or 404 when no subscription', async ({ page }) => {
    const response = await page.request.get('/api/subscription');
    // Either 404 or 200 with null/empty body
    if (response.status() === 404) {
      expect(response.status()).toBe(404);
    } else {
      expect(response.ok()).toBeTruthy();
      const sub = await response.json();
      expect(sub).toBeNull();
    }
  });

  test('API: Feature gating blocks dictation (no subscription)', async ({ page }) => {
    const response = await page.request.post('/api/dictation/start', {
      data: { profile: 'generic' },
    });
    expect(response.status()).toBe(403);
    const data = await response.json();
    expect(data.detail.error).toBe('no_subscription');
    expect(data.detail.feature).toBe('dictation');
  });

  test('Landing page / shows one-shot simple (public, no auth)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Transcription a la demande')).toBeVisible({ timeout: 10_000 });
  });
});
