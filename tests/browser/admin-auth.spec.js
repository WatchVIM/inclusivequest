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


test('private image upload and revision restore require saved drafts and preserve publication', async ({ page }) => {
  await page.goto(fixture);
  const before = await page.evaluate(() => window.adminFixture.getRecords()[0].published.heading);
  await page.getByLabel('Alternative text', { exact: true }).fill('Test artwork for browser verification');
  await page.locator('input[type="file"]').setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: Buffer.from('test-only-file') });
  await expect(page.getByRole('status')).toContainText('Image uploaded privately');
  await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeDisabled();
  await page.getByLabel('Page heading', { exact: true }).fill('A draft to restore');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved to the server');
  await page.getByRole('button', { name: 'Revision history', exact: true }).click();
  await page.getByRole('button', { name: 'Restore as draft', exact: true }).first().click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Nothing was published');
  await expect(page.getByLabel('Page heading', { exact: true })).toHaveValue(before);
  expect(await page.evaluate(() => window.adminFixture.getRecords()[0].published.heading)).toBe(before);
  expect(await page.evaluate(() => window.adminFixture.calls.filter(call => call[0] === 'publish'))).toEqual([]);
});

test('sponsor stays off until saved and explicitly published, then unpublishes without removing draft', async ({ page }) => {
  await page.goto(fixture);
  await page.getByRole('button', { name: /^Sponsors/ }).click();
  await page.getByRole('button', { name: '+ Add sponsor', exact: true }).click();
  await expect(page.getByLabel('Enable when published', { exact: true })).not.toBeChecked();
  await page.getByLabel('Sponsor name', { exact: true }).fill('Browser test sponsor');
  await page.getByLabel('Destination link', { exact: true }).fill('https://example.com/');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved');
  await page.getByLabel('Alternative text', { exact: true }).fill('Sponsor browser test artwork');
  await page.locator('input[type="file"]').setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: Buffer.from('mock-file') });
  await expect(page.getByRole('status')).toContainText('Image uploaded privately');
  await page.getByLabel('Enable when published', { exact: true }).check();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved');
  expect(await page.evaluate(() => window.adminFixture.getRecords().find(record => record.type === 'sponsor').published)).toBeNull();
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.adminFixture.calls.filter(call => call[0] === 'publish'))).toEqual([]);
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Published successfully');
  await page.getByRole('button', { name: 'Unpublish', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Unpublished successfully');
  const saved = await page.evaluate(() => window.adminFixture.getRecords().find(record => record.type === 'sponsor'));
  expect(saved.published).toBeNull();
  expect(saved.draft.name).toBe('Browser test sponsor');
});
