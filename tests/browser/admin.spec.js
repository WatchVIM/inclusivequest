import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { createSeedDocuments } from '../../src/cms/content-model.js';

async function openAdmin(page) {
  await page.goto('/admin');
  await page.getByRole('button', { name:'Open review workspace' }).click();
}
async function section(page,name) { await page.getByRole('navigation',{name:'Content sections'}).getByRole('button',{name}).click(); }
async function siteNav(page,container,name) {
  const desktop=container.getByRole('navigation',{name:'Main navigation'});
  if (await desktop.isVisible()) await desktop.getByRole('button',{name,exact:true}).click();
  else { await container.getByRole('button',{name:'Toggle navigation'}).click(); await container.getByRole('navigation',{name:'Mobile navigation'}).getByRole('button',{name,exact:true}).click(); }
}

test('production admin stays locked and public site preserves current content', async ({page}) => {
  await page.goto('http://127.0.0.1:4173/admin');
  await expect(page.getByText('Secure publishing is not connected yet.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Open review workspace'})).toHaveCount(0);
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.getByRole('heading',{name:/Accessible Podcasts/})).toBeVisible();
  await expect(page.getByRole('button',{name:'Start Watching'})).toBeVisible();
});

test('admin keyboard controls, fail-closed controls and mobile layout', async ({page}) => {
  await openAdmin(page);
  await expect(page.getByRole('button',{name:'Publish (not connected)'})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Upload image (not connected)'})).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  const result=await new AxeBuilder({page}).include('.admin-root').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
  await page.getByLabel('Page heading',{exact:true}).fill('Unsaved heading');
  await section(page,'Founder');
  await expect(page.getByRole('dialog',{name:'Discard unsaved field changes?'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Page heading',{exact:true})).toHaveValue('Unsaved heading');
  await section(page,'Founder');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Alma Beaty');
});

test('page draft previews actual website without changing URL or published reference', async ({page}) => {
  await openAdmin(page);
  await page.getByLabel('Page heading',{exact:true}).fill('Access for every story.');
  await page.getByRole('button',{name:'Keep draft in this tab'}).click();
  await expect(page.getByRole('status')).toContainText('Nothing was published');
  await page.getByRole('button',{name:'Preview website',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Draft website preview'});
  await expect(dialog.getByRole('heading',{name:/Access for every story/})).toBeVisible();
  await siteNav(page,dialog,'About');
  await expect(dialog.getByRole('heading',{name:'About Inclusive Quest',exact:true})).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'View published reference'}).click();
  await expect(page.getByRole('dialog').getByRole('heading',{name:/Accessible Podcasts/})).toBeVisible();
  await page.getByRole('button',{name:'Close Published reference preview'}).click();
  await expect(page.getByLabel('Page heading',{exact:true})).toHaveValue('Access for every story.');
});

test('YouTube draft appears on actual website, validates links and loads only on click', async ({page}) => {
  await page.route('https://www.youtube-nocookie.com/**', route=>route.fulfill({contentType:'text/html',body:'<title>Test video fixture</title>'}));
  await openAdmin(page); await section(page,'YouTube episodes');
  await page.getByRole('button',{name:'+ Add episode'}).click();
  await page.getByLabel('Show title',{exact:true}).fill('IQ conversations');
  await page.getByLabel('Episode title',{exact:true}).fill('Access in action');
  await page.getByLabel('Description',{exact:true}).fill('Building a more accessible podcast world.');
  await page.getByLabel('YouTube video URL').fill('https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ');
  await page.getByRole('button',{name:'Keep draft in this tab'}).click();
  await expect(page.getByText('Enter a full HTTPS YouTube video link (watch, shorts, live, or youtu.be).')).toBeVisible();
  await page.getByLabel('YouTube video URL').fill('https://youtu.be/dQw4w9WgXcQ?t=20');
  await page.getByLabel('Tags (comma-separated)').fill('community, accessibility');
  await page.getByRole('button',{name:'Keep draft in this tab'}).click();
  await page.getByRole('button',{name:'Preview website',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Draft website preview'});
  await siteNav(page,dialog,'Explore');
  await dialog.getByLabel('Search podcasts by topic or interpreter').fill('community');
  await expect(dialog.getByRole('heading',{name:'IQ conversations',exact:true})).toBeVisible();
  await expect(dialog.getByText('Access in action',{exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'View Episode'}).click();
  await expect(dialog.getByText('Building a more accessible podcast world.',{exact:true}).first()).toBeVisible();
  await expect(dialog.locator('iframe')).toHaveCount(0);
  await dialog.getByRole('button',{name:'Load YouTube video'}).click();
  await expect(dialog.locator('iframe')).toHaveAttribute('src','https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&cc_load_policy=1');
  await page.getByRole('button',{name:'Close Draft website preview'}).click();
  await page.getByRole('button',{name:'View published reference'}).click();
  await siteNav(page,page.getByRole('dialog'),'Explore');
  await expect(page.getByRole('dialog').getByRole('heading',{name:'IQ conversations',exact:true})).toHaveCount(0);
});

test('download and import recover drafts without publishing, including blog template', async ({page}) => {
  await openAdmin(page); await section(page,'Blog posts');
  await page.getByLabel('New post template').selectOption('announcement');
  await page.getByRole('button',{name:'+ Add post'}).click();
  await expect(page.getByLabel('Post text')).toHaveValue(/The news/);
  await page.getByLabel('Post title',{exact:true}).fill('Our next chapter');
  await page.getByLabel('Post slug').fill('our-next-chapter');
  await page.getByLabel('Summary',{exact:true}).fill('An Inclusive Quest update.');
  await page.getByRole('button',{name:'Keep draft in this tab'}).click();
  const downloadPromise=page.waitForEvent('download'); await page.getByRole('button',{name:'Download drafts'}).click();
  const download=await downloadPromise; const content=await readFile(await download.path(),'utf8');
  expect(JSON.parse(content).drafts.find(item=>item.data.title==='Our next chapter').published).toBeUndefined();
  await page.getByRole('button',{name:'Preview website',exact:true}).click();
  const dialog=page.getByRole('dialog'); await siteNav(page,dialog,'Blog');
  await dialog.getByRole('button',{name:'Read story →'}).click();
  await expect(dialog.getByRole('heading',{name:'Our next chapter',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Close Draft website preview'}).click();
  await page.locator('input[type=file]').setInputFiles({name:'draft.json',mimeType:'application/json',buffer:Buffer.from(content)});
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Draft review imported');
});

test('configured public reader renders a published YouTube snapshot and ignores draft-bearing responses', async ({page}) => {
  const documents=createSeedDocuments().map(({id,type,published})=>({id,type,published}));
  documents.find(record=>record.type==='episode').published={...documents.find(record=>record.type==='episode').published,episodeTitle:'Published via CMS',youtubeUrl:'https://youtu.be/dQw4w9WgXcQ',description:'Published episode description.',tags:['published-tag']};
  await page.route('**/api/content',route=>route.fulfill({json:{schemaVersion:1,documents}}));
  await page.goto('/#/explore');
  await expect(page.getByText('Published via CMS',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'View Episode'}).click();
  await expect(page.getByRole('link',{name:'Watch on YouTube'})).toHaveAttribute('href','https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  await expect(page.locator('iframe.youtube-frame')).toHaveCount(0);
  documents[0].draft={...documents[0].published,heading:'PRIVATE DRAFT'};
  await page.goto('/');
  await expect(page.getByRole('heading',{name:/Accessible Podcasts/})).toBeVisible();
  await expect(page.getByText('PRIVATE DRAFT')).toHaveCount(0);
});
