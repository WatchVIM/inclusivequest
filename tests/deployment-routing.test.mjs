import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));

test('admin routes target the extensionless HTML output when Vercel cleanUrls is enabled',()=>{
  assert.equal(config.cleanUrls,true);
  for(const path of ['/admin','/admin/','/admin/sponsors','/admin/sponsors/']) {
    const rule=config.rewrites.find(item=>item.source===path);
    assert.ok(rule,`${path} must have a direct-entry rewrite`);
    assert.equal(rule.destination,'/index');
  }
  for(const rule of config.rewrites) assert.ok(!rule.destination.endsWith('.html'),'cleanUrls removes .html before Vercel applies the destination rewrite');
});
