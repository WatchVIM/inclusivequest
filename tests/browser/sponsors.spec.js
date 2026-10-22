import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openReview(page) {
  await page.goto('/admin/sponsors');
  await expect(page.getByRole('heading', { name: 'Sponsor placement review', exact: true })).toBeVisible();
}
async function enableSample(page) {
  await page.getByRole('button', { name: 'Load local sample' }).click();
  await page.getByRole('checkbox', { name: 'Enabled in review preview' }).check();
  await page.getByRole('button', { name: 'Keep preview changes' }).click();
}

test('sponsor controls and two independent placements work without live writes', async ({ page }) => {
  const writes = [];
  page.on('request', request => { if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push(request.url()); });
  await openReview(page);
  await expect(page.getByRole('complementary', { name: /sponsorship/ })).toHaveCount(0);
  await enableSample(page);
  const home = page.getByRole('complementary', { name: 'Homepage sponsorship' });
  await expect(home).toBeVisible();
  await expect(home.getByRole('img')).toHaveAttribute('alt', /not an advertiser/);
  await expect(home.getByRole('link')).toHaveAttribute('rel', 'sponsored noopener noreferrer');
  await page.getByRole('group', { name: 'Choose sponsor placement' }).getByRole('button', { name: 'Podcast episode pages' }).click();
  await expect(page.getByRole('checkbox', { name: 'Enabled in review preview' })).not.toBeChecked();
  await enableSample(page);
  const episode = page.getByRole('complementary', { name: 'Podcast episode pages sponsorship' });
  await expect(episode).toBeVisible();
  expect(await episode.evaluate(element => element.previousElementSibling.classList.contains('synced-player-shell') && !element.closest('.synced-player-shell'))).toBe(true);
  await page.getByRole('checkbox', { name: 'Enabled in review preview' }).uncheck();
  await page.getByRole('button', { name: 'Keep preview changes' }).click();
  await expect(episode).toHaveCount(0);
  await page.getByRole('button', { name: 'View homepage' }).click(); await expect(home).toBeVisible();
  expect(writes).toEqual([]);
  await page.reload(); await expect(page.getByRole('complementary', { name: /sponsorship/ })).toHaveCount(0);
});

test('sponsor preview is responsive, keyboard-usable and has no scoped accessibility violations', async ({ page }) => {
  await openReview(page); await enableSample(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const checks = await new AxeBuilder({ page }).include('.sponsor-review-controls').include('.sponsor-preview-toolbar').include('.sponsor-placement').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(checks.violations).toEqual([]);
  await page.getByRole('textbox', { name: 'Destination link' }).fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Keep preview changes' }).click();
  await expect(page.getByRole('textbox', { name: 'Destination link' })).toBeFocused();
  await expect(page.getByRole('textbox', { name: 'Destination link' })).toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: 'Discard field changes' }).click();
  const link = page.getByRole('complementary', { name: 'Homepage sponsorship' }).getByRole('link');
  await link.focus(); await expect(link).toBeFocused();
  await page.getByRole('button', { name: 'View episode page' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('production build does not expose sponsor review controls or active ads', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/admin/sponsors');
  await expect(page.getByRole('heading', { name: 'Sponsor preview is not available here.' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Sponsor name' })).toHaveCount(0);
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.getByRole('complementary', { name: /sponsorship/ })).toHaveCount(0);
});
