import { test, expect } from '@playwright/test';

const fixture = '/tests/browser/fixtures/admin-auth.html';

test('authenticated publisher saves, previews and confirms publication on desktop and mobile', async ({ page }) => {
  await page.goto(fixture);
  await expect(page.getByLabel('Page heading', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Publishing environment')).toContainText('Connected CMS preview');
  await expect(page.getByLabel('Publishing environment')).toContainText('Production is not connected for this review');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByLabel('Page heading', { exact: true }).fill('Private browser-tested heading');
  await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved to the server');
  await page.getByRole('button', { name: 'Preview draft', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: /Private browser-tested heading/ })).toBeVisible();
  await page.getByRole('button', { name: 'Close Draft website preview' }).click();
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Publish this draft?' })).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.adminFixture.calls.filter(call => call[0] === 'publish'))).toEqual([]);
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Published successfully');
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test('conflict and expired session preserve private unsaved fields without displaying them signed out', async ({ page }) => {
  await page.goto(fixture);
  await page.getByLabel('Page heading', { exact: true }).fill('My unsaved browser work');
  await page.evaluate(() => window.adminFixture.concurrentEdit());
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Someone changed this content');
  await expect(page.getByLabel('Page heading', { exact: true })).toHaveValue('My unsaved browser work');
  await page.evaluate(() => window.adminFixture.expire());
  await expect(page.getByRole('button', { name: 'Email me a sign-in link' })).toBeVisible();
  await expect(page.getByLabel('Page heading', { exact: true })).toHaveCount(0);
  await page.evaluate(() => window.adminFixture.signIn());
  await expect(page.getByLabel('Page heading', { exact: true })).toHaveValue('My unsaved browser work');
  await page.getByRole('button', { name: 'Reload latest saved version' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Page heading', { exact: true })).toHaveValue('My unsaved browser work');
  await page.getByRole('button', { name: 'Reload latest saved version' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByLabel('Page heading', { exact: true })).toHaveValue('Changed by another editor');
});

test('editor publishing is disabled and sign-out confirmation can be cancelled', async ({ page }) => {
  await page.goto(fixture + '?role=editor');
  await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Unpublish', exact: true })).toBeDisabled();
  await page.getByLabel('Page heading', { exact: true }).fill('Unsaved editor fields');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByLabel('Page heading', { exact: true })).toHaveValue('Unsaved editor fields');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Email me a sign-in link' })).toBeVisible();
  await expect(page.getByLabel('Page heading', { exact: true })).toHaveCount(0);
});
