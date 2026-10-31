import { expect, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { STAGES, type MechanicsRegister } from '../../tools/mechanics-types';
import { renderHtml, validateRegister } from '../../tools/build-mechanics-register';
async function expectedCompletion() {
  const data = JSON.parse(await readFile(new URL('../../docs/mechanics/register.json', import.meta.url), 'utf8')) as MechanicsRegister;
  const total = data.mechanics.length * STAGES.length;
  const covered = data.mechanics.reduce((sum, m) => sum + STAGES.filter(stage => m.stages[stage] === 'covered').length, 0);
  const percent = total === 0 ? 0 : covered === total ? 100 : Math.min(99.9, Math.round(covered / total * 1000) / 10);
  return { covered, total, percent };
}

test('register search, evidence navigation, level relationships and export work', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/docs/mechanics/index.html');
  await expect(page.getByRole('heading', { name: 'Master Mechanics Register' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('overview.png') });
  await page.getByRole('link', { name: '02 · Mechanics register' }).click();
  await page.getByRole('searchbox', { name: 'Find a mechanic' }).fill('drowning');
  await expect(page.locator('#LIFE-03')).toBeVisible();
  await expect(page.locator('#ENV-05')).toBeHidden();
  await page.locator('#LIFE-03 > summary').click();
  await expect(page.locator('#LIFE-03 .original')).toContainText('threshold damage');
  await expect(page.locator('#LIFE-03 a[href="../../tests/drowning-decision.test.ts"]')).toBeVisible();
  await page.locator('#LIFE-03 a[href="#map-43"]').click();
  await expect(page.locator('#map-43')).toBeVisible();
  await expect(page.locator('#map-43')).toHaveAttribute('open', '');
  await expect(page.locator('#map-43 .card-body')).toContainText('PR116 bounded wet injury/death');
  await expect(page.locator('#map-43 .card-body')).toContainText('complete original level remain unaccepted');
  await expect(page.locator('#map-43 .card-body')).toContainText('Standing22 is accepted PR118; unsupported and whole-level outcomes remain open');
  await page.goto('/docs/mechanics/index.html#T43-05');
  await expect(page.locator('#T43-05')).toContainText('Partial');
  await expect(page.locator('#T43-06')).toContainText('Partial');
  await expect(page.locator('#T43-05')).toContainText('Accepted PR122 proves the admitted original99 timeout');
  await page.goto('/docs/mechanics/index.html#map-43');
  await page.locator('#map-43 .interaction-list a[href="#MOV-03"]').click();
  await expect(page.locator('#MOV-03')).toBeVisible();
  await expect(page.locator('#MOV-03')).toHaveAttribute('open', '');
  await expect(page.getByRole('searchbox')).toHaveValue('');
  await page.getByLabel('Family', { exact: true }).selectOption('Psi');
  await page.getByLabel('Mapping status').selectOption('open');
  await expect(page.locator('#PSI-12')).toBeVisible();
  await expect(page.locator('#MOV-03')).toBeHidden();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('#MOV-03')).toBeVisible();
  await page.getByRole('searchbox').fill('no-such-mechanic-999');
  await expect(page.locator('#no-results')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export register JSON' }).click();
  const exported = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
  expect(exported.levels.filter((l: { firstAcceptance: boolean }) => l.firstAcceptance).map((l: { id: string }) => l.id)).toEqual(['map-43']);
  expect(exported.mechanics).toHaveLength(86);
  expect(errors).toEqual([]);
});
test('deep links and training group retain explicit unverified classifications', async ({ page }) => {
  await page.goto('/docs/mechanics/index.html#map-45');
  await expect(page.locator('#map-45')).toBeVisible();
  await expect(page.locator('#map-45')).toHaveAttribute('open', '');
  await expect(page.locator('#map-45 .card-body')).toContainText('present unverified');
  await expect(page.locator('#map-45 .classification.required')).toHaveCount(0);
  await page.getByRole('link', { name: '03 · Training43 acceptance' }).click();
  await expect(page.locator('#acceptance .check')).toHaveCount(10);
  await expect(page.locator('#T43-05')).toContainText('Partial');
  await expect(page.locator('#acceptance input[type="checkbox"]')).toHaveCount(0);
});
for (const width of [390, 1440]) test(`register fits ${width}px and remains keyboard operable`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/docs/mechanics/index.html#register');
  await page.locator('#COMBAT-01 > summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#COMBAT-01')).toHaveAttribute('open', '');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`mechanic-${width}.png`) });
  await page.goto('/docs/mechanics/index.html#map-47');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('standalone HTML works offline as a local file', async ({ page }) => {
  const remoteRequests: string[] = [];
  await page.context().setOffline(true);
  page.on('request', request => { if (/^https?:/.test(request.url())) remoteRequests.push(request.url()); });
  const file = fileURLToPath(new URL('../../docs/mechanics/index.html', import.meta.url));
  await page.goto(`${pathToFileURL(file).href}#LIFE-03`);
  await expect(page.locator('#LIFE-03')).toBeVisible();
  await expect(page.locator('#LIFE-03')).toHaveAttribute('open', '');
  const completion = await expectedCompletion();
  await expect(page.getByRole('progressbar', { name: 'Whole-game evidence coverage' })).toHaveAttribute('value', String(completion.percent));
  await page.locator('.completion-method > summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#completion-method')).toBeVisible();
  await page.getByRole('searchbox').focus();
  await page.keyboard.insertText('MOV-03');
  await expect(page.locator('#MOV-03')).toBeVisible();
  await expect(page.locator('#LIFE-03')).toBeHidden();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export register JSON' }).focus();
  await page.keyboard.press('Enter');
  const exported = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
  expect(exported).toEqual(JSON.parse(await readFile(new URL('../../docs/mechanics/register.json', import.meta.url), 'utf8')));
  expect(remoteRequests).toEqual([]);
});
test('global register completion stays stable under search, filters, level groups and deep links', async ({ page }) => {
  const { covered, total, percent } = await expectedCompletion();
  await page.goto('/docs/mechanics/index.html#register');
  const progress = page.getByRole('progressbar', { name: 'Whole-game evidence coverage' });
  const verify = async () => {
    await expect(progress).toHaveAttribute('value', String(percent));
    await expect(progress).toHaveAttribute('max', '100');
    await expect(page.locator('.completion-value')).toHaveText(percent.toFixed(1) + '%');
    await expect(page.locator('#completion-counts')).toHaveText(`${covered} / ${total} evidence checkpoints covered`);
  };
  await verify();
  await page.getByRole('searchbox').fill('no-such-mechanic-999');
  await expect(page.locator('#no-results')).toBeVisible(); await verify();
  await page.getByLabel('Family', { exact: true }).selectOption('Psi'); await verify();
  await page.getByLabel('Mapping status').selectOption('open'); await verify();
  await page.goto('/docs/mechanics/index.html#levels');
  await page.locator('#level-group').selectOption('training');
  await expect(page.locator('#map-01')).toBeHidden(); await verify();
  await page.goto('/docs/mechanics/index.html#map-45');
  await expect(page.locator('#map-45')).toHaveAttribute('open', ''); await verify();
  await page.goto('/docs/mechanics/index.html#MOV-03');
  await expect(page.locator('#MOV-03')).toHaveAttribute('open', ''); await verify();
});
for (const width of [390, 1440]) test(`register completion placement and accessible method at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/docs/mechanics/index.html');
  const heading = (await page.getByRole('heading', { level: 1 }).boundingBox())!;
  const indicator = (await page.locator('#register-completion').boundingBox())!;
  if (width === 1440) {
    expect(indicator.x).toBeGreaterThan(heading.x + heading.width);
    expect(indicator.y).toBeLessThan(heading.y + heading.height);
  } else {
    expect(indicator.y).toBeGreaterThanOrEqual(heading.y + heading.height);
    expect(indicator.y - (heading.y + heading.height)).toBeLessThan(30);
  }
  expect(indicator.x + indicator.width).toBeLessThanOrEqual(width);
  await page.screenshot({ path: testInfo.outputPath(`completion-${width}.png`) });
  await page.locator('.completion-method > summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#completion-method')).toBeVisible();
  await expect(page.locator('#completion-method')).toContainText('partial/open earn zero');
  await expect(page.getByRole('progressbar')).toHaveAccessibleName('Whole-game evidence coverage');
  await expect(page.getByRole('progressbar')).toHaveAccessibleDescription(/covered checkpoints.*all registered evidence checkpoints/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
for (const field of ['scenario-id', 'scenario-kind', 'level-id', 'level-group', 'acceptance-id']) test(`offline HTML contains refused ${field} metadata without executing it`, async ({ page }, testInfo) => {
  const data = JSON.parse(await readFile(new URL('../../docs/mechanics/register.json', import.meta.url), 'utf8')) as MechanicsRegister;
  const payload = 'x"><img src=x onerror="window.__registerInjected=1">';
  if (field === 'scenario-id') {
    const old = data.scenarios[0]!.id; data.scenarios[0]!.id = payload;
    for (const m of data.mechanics) m.scenarios = m.scenarios.map(id => id === old ? payload : id);
  }
  if (field === 'scenario-kind') Object.assign(data.scenarios[0]!, { kind: payload });
  if (field === 'level-id') data.levels.find(l => !l.firstAcceptance)!.id = payload;
  if (field === 'level-group') Object.assign(data.levels.find(l => !l.firstAcceptance)!, { group: payload });
  if (field === 'acceptance-id') data.acceptanceChecks[0]!.id = payload;
  await expect(validateRegister(data)).rejects.toThrow('Invalid');
  // Exercise escaping independently of validation: callers may render a preview
  // before validating. The old renderer executed these exact five payloads.
  const file = testInfo.outputPath('refused-metadata.html');
  await writeFile(file, renderHtml(data));
  await page.context().setOffline(true);
  const requests: string[] = [], errors: string[] = [];
  page.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(file).href);
  expect(await page.evaluate(() => Reflect.get(window, '__registerInjected'))).toBeUndefined();
  await expect(page.locator('img, [onerror]')).toHaveCount(0);
  await expect(page.locator('script')).toHaveCount(2);
  const record = field.startsWith('scenario') ? page.locator('.scenario').first() : field.startsWith('level') ? page.locator('.level').first() : page.locator('.check').first();
  if (field.endsWith('-id')) await expect(record).toHaveAttribute('id', field === 'scenario-id' ? `scenario-${payload}` : payload);
  if (field === 'level-group') await expect(record).toHaveAttribute('data-group', payload);
  if (field === 'scenario-kind') await expect(record.locator('.kind')).toHaveText(payload);
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});
test('accepted hostile prose survives offline text, attribute, search and JSON export round trips', async ({ page }, testInfo) => {
  const data = JSON.parse(await readFile(new URL('../../docs/mechanics/register.json', import.meta.url), 'utf8')) as MechanicsRegister;
  const prose = '" \' & <img src=x onerror="window.__registerInjected=1"> </script><script>window.__registerInjected=2</script>';
  const m = data.mechanics[0]!;
  m.family = prose; m.title = prose; m.original = prose; m.mappingScope = prose;
  m.source = prose; m.next = prose; m.gaps = [prose];
  m.evidence[0]!.label = prose; m.evidence[0]!.scope = prose;
  data.baseline.label = prose; data.baseline.description = prose; data.scope = prose;
  data.scenarios[0]!.title = prose; data.scenarios[0]!.instructions = prose; data.scenarios[0]!.scope = prose;
  const l = data.levels[0]!; l.title = prose; l.audit = prose; l.revision = prose; l.archivePath = prose; l.blockers = [prose]; l.interactions[0]!.basis = prose;
  data.acceptanceChecks[0]!.title = prose; data.acceptanceChecks[0]!.requirement = prose;
  data.commands[0] = { label: prose, command: prose, scope: prose }; data.limitations = [prose];
  await validateRegister(data);
  const file = testInfo.outputPath('accepted-prose.html'); await writeFile(file, renderHtml(data));
  await page.context().setOffline(true);
  const requests: string[] = [], errors: string[] = [];
  page.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${pathToFileURL(file).href}#${m.id}`);
  const card = page.locator(`#${m.id}`);
  await expect(card).toHaveAttribute('data-family', prose);
  await expect(card.locator('.original')).toHaveText(prose);
  await expect(card.locator('.identity strong')).toHaveText(prose);
  await expect(page.locator('.scenario h3').first()).toHaveText(prose);
  await expect(page.locator('.check p').first()).toHaveText(prose);
  await expect(page.locator('.level .card-body > p').first()).toHaveText(prose);
  await expect(page.locator('img, [onerror], [onfocus], [autofocus]')).toHaveCount(0);
  await expect(page.locator('script')).toHaveCount(2);
  await page.getByRole('searchbox').fill('<img'); await expect(card).toBeVisible();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export register JSON' }).click();
  expect(JSON.parse(await readFile((await (await download).path())!, 'utf8'))).toEqual(data);
  expect(await page.evaluate(() => Reflect.get(window, '__registerInjected'))).toBeUndefined();
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});
test('separate capability and original-level summaries retain scope, lineage and runnable controls', async ({ page }) => {
  await page.goto('/docs/mechanics/index.html#testbed-capability');
  await expect(page.locator('#testbed-capability')).toBeVisible();
  await expect(page.locator('#testbed-capability .milestone-counts')).toHaveText('13 listed milestones: 11 playable · 0 partial · 1 open · 1 deferred');
  await expect(page.locator('#cap-food')).toContainText('medical64');
  await expect(page.locator('#cap-wet')).toContainText('including zero');
  await expect(page.locator('#cap-lifecycle')).toContainText('Accepted PR116');
  await expect(page.locator('#cap-lifecycle')).toContainText('v16 paused chronological recovery');
  await expect(page.locator('#cap-hardware')).toContainText('does not block keyboard software');
  await page.locator('#cap-food a[href="#INV-06"]').click();
  await expect(page.locator('#INV-06')).toHaveAttribute('open', '');
  await page.goto('/docs/mechanics/index.html#training43-software');
  await expect(page.locator('#training43-software .milestone-counts')).toHaveText('12 listed milestones: 9 playable · 2 partial · 1 open · 0 deferred');
  await page.locator('#t43-entry a[href="#scenario-wet"]').click();
  await expect(page.locator('#scenario-wet')).toBeVisible();
  await expect(page.locator('#scenario-wet')).toContainText('Enable Training43 wet traversal');
  await page.locator('#scenario-wet a[href="../../docs/training43-wet-traversal.md"]').click();
  expect(new URL(page.url()).pathname).toBe('/docs/training43-wet-traversal.md');
});

for (const width of [390,1440]) test(`offline lifecycle controls select accepted v16 at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.context().setOffline(true);
  const requests: string[] = [], errors: string[] = [];
  page.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
  page.on('pageerror', e => errors.push(e.message));
  const file = new URL('../../docs/mechanics/index.html', import.meta.url);
  await page.goto(`${file.href}#t43-lifecycle`);
  await expect(page.locator('#t43-lifecycle h4 .badge')).toHaveText('partial');
  await expect(page.locator('#t43-lifecycle .evidence-list')).toContainText('T43-05/06 remain partial');
  await page.locator('#t43-lifecycle').getByRole('link', { name: 'Runnable entry / controls' }).focus();
  await page.keyboard.press('Enter');
  expect(new URL(page.url()).hash).toBe('#scenario-wet-lifecycle');
  const controls = page.locator('#scenario-wet-lifecycle');
  await expect(controls).toBeVisible();
  await expect(controls).toContainText('Enable wet damage and lifecycle');
  await expect(controls).toContainText('v16 paused chronological recovery');
  await expect(controls).not.toContainText('Enable Training43 wet traversal');
  await expect(controls).not.toContainText('Stops before every non-null requested hit');
  await expect(controls.getByRole('link', { name: 'Instructions & limitations →' })).toHaveAttribute('href', '../../docs/training43-wet-lifecycle.md');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`lifecycle-controls-${width}.png`) });
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});

for (const width of [390,1440]) test(`offline accepted dashboard prose stays inert with working canaries at ${width}px`, async ({ page }, testInfo) => {
  const data = JSON.parse(await readFile(new URL('../../docs/mechanics/register.json', import.meta.url), 'utf8')) as MechanicsRegister;
  const prose = '" \' & <img src=x onerror="window.__registerInjected=1"> </script><script>window.__registerInjected=2</script> [link](javascript:bad)';
  for (const d of data.dashboards) {
    d.title = prose; d.scope = prose;
    for (const m of d.milestones) {
      m.title = prose; m.scope = prose; m.missing = prose;
      m.evidence.forEach(e => { e.label = prose; e.scope = prose; });
    }
  }
  await validateRegister(data);
  const file = testInfo.outputPath('accepted-dashboard-prose.html'); await writeFile(file, renderHtml(data));
  await page.setViewportSize({ width, height: 1000 });
  await page.context().setOffline(true);
  const requests: string[] = [], errors: string[] = [];
  page.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${pathToFileURL(file).href}#testbed-capability`);
  await expect(page.locator('#testbed-capability > h3')).toHaveText(prose);
  await expect(page.locator('#cap-food > p').first()).toHaveText(prose);
  await expect(page.locator('#cap-food .evidence-list a').first()).toHaveText(prose);
  await expect(page.locator('img, [onerror], [onclick], [onfocus], [autofocus]')).toHaveCount(0);
  await expect(page.locator('script')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#cap-food a[href="#INV-06"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#INV-06')).toHaveAttribute('open', '');
  await page.getByRole('searchbox').fill('no-such-dashboard-canary');
  await expect(page.locator('#no-results')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('#INV-06')).toBeVisible();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export register JSON' }).click();
  expect(JSON.parse(await readFile((await (await download).path())!, 'utf8'))).toEqual(data);
  expect(await page.evaluate(() => Reflect.get(window, '__registerInjected'))).toBeUndefined();
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});

for (const width of [390,1440]) test(`canonical offline standing22 links select accepted v17 at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 1000 }); await page.context().setOffline(true);
  const requests: string[] = [], errors: string[] = [];
  page.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
  page.on('pageerror', e => errors.push(e.message));
  const file = new URL('../../docs/mechanics/index.html', import.meta.url);
  await page.goto(`${file.href}#t43-standing22`);
  await expect(page.locator('#t43-standing22 .badge')).toHaveText('playable');
  await page.locator('#t43-standing22').getByRole('link', { name: 'Runnable entry / controls' }).focus();
  await page.keyboard.press('Enter'); await expect(page).toHaveURL(/#scenario-wet-region$/);
  const controls = page.locator('#scenario-wet-region');
  await expect(controls).toContainText('Enable wet-region exploration');
  await expect(controls).toContainText('v17 paused chronological recovery');
  await expect(controls).not.toContainText('Enable Training43 wet traversal');
  await expect(controls).not.toContainText('Enable wet damage and lifecycle');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`standing22-${width}.png`) });
  await controls.getByRole('link', { name: 'Instructions & limitations →' }).focus(); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/docs\/training43-wet-region.md$/);
  await expect(page.locator('body')).toContainText('accepted PR118');
  await expect(page.locator('body')).toContainText('Enable wet-region exploration');
  await page.goto(`${file.href}#proof-118`);
  await expect(page.locator('#proof-118')).toContainText('no separate receipt comment observed');
  await expect(page.locator('#proof-118')).toContainText('d78e3293e6f67e91c6d15c53631bb54f46510224');
  await expect(page.locator('#proof-118')).toContainText('a3b5964dbede6c20c16285c4db8661b3b176c8e4');
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export register JSON' }).focus(); await page.keyboard.press('Enter');
  expect(JSON.parse(await readFile((await (await download).path())!, 'utf8'))).toEqual(JSON.parse(await readFile(new URL('../../docs/mechanics/register.json', import.meta.url), 'utf8')));
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});

test('invalid new proof-field previews stay inert offline and export exact data', async ({ page }, testInfo) => {
  const data = JSON.parse(await readFile(new URL('../../docs/mechanics/register.json', import.meta.url), 'utf8')) as MechanicsRegister;
  const payload = '" \' & </script><img src=x onerror="window.__registerInjected=1"> [link](javascript:bad)';
  Object.assign(data.acceptedProofs.find(p => p.pr === 118)!, { receiptKind: payload, tree: payload, reviewedTree: payload, sourceProofBase: payload });
  await expect(validateRegister(data)).rejects.toThrow();
  const file = testInfo.outputPath('refused-proof-fields.html'); await writeFile(file, renderHtml(data));
  await page.context().setOffline(true);
  const requests: string[] = [], errors: string[] = [];
  page.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); }); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${pathToFileURL(file).href}#proof-118`);
  await expect(page.locator('#proof-118')).toContainText(payload);
  await expect(page.locator('img, [onerror]')).toHaveCount(0); await expect(page.locator('script')).toHaveCount(2);
  expect(await page.evaluate(() => Reflect.get(window, '__registerInjected'))).toBeUndefined();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export register JSON' }).click();
  expect(JSON.parse(await readFile((await (await download).path())!, 'utf8'))).toEqual(data);
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});

for (const width of [390,1440]) test(`accepted120 selected-team controls match actual app semantics at ${width}px`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:1000});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/docs/mechanics/index.html#t43-selected-all-dead');
 await expect(page.locator('#t43-selected-all-dead .badge')).toHaveText('playable');
 await page.locator('#t43-selected-all-dead').getByRole('link',{name:'Runnable entry / controls'}).focus();await page.keyboard.press('Enter');
 const entry=page.locator('#scenario-wet-party');await expect(entry).toBeVisible();
 for(const text of ['Apply team to Training43','Enable selected-team wet lifecycle','fresh PAUSED tick zero','Start mission','[1,3,0,5]','[0,0,3,4]','manual','V18'])await expect(entry).toContainText(text);
 await expect(entry).not.toContainText('Enable wet-region exploration');await expect(entry).not.toContainText('Enable wet damage and lifecycle');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await entry.screenshot({path:testInfo.outputPath(`selected-controls-${width}.png`)});
 await entry.getByRole('link',{name:'Instructions & limitations →'}).focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(/\/docs\/training43-selected-team-all-dead\.md$/);
 await expect(page.locator('body')).toContainText('Accepted PR120');await expect(page.locator('body')).toContainText('Apply team to Training43');
 await page.goto('/docs/mechanics/index.html#proof-120');const proof=page.locator('#proof-120');
 for(const text of ['574c5a954aa390883d79906bff80a803f2eb4009','fdb34eb8a0f7229d46482e5319bd483961b04653','source-proof base (PR118)','6531111769','separate-receipt-comment'])await expect(proof).toContainText(text);
 // Resolve the documented entry to real semantic controls and admission messaging.
 await page.goto('/');await expect(page.getByRole('button',{name:'Enable selected-team wet lifecycle',exact:true})).toBeDisabled();
 await expect(page.locator('#training-wet-party')).toContainText('Choose four different characters');await expect(page.locator('#training-wet-party')).toContainText('At fresh PAUSED tick zero');
 await expect(page.locator('#training-wet-party')).toContainText('All four dead ends the mission before timeout or exit');
 await page.locator('#roster-panel > summary').focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Apply team to Training43',exact:true})).toBeDisabled();
 await expect(page.locator('#play')).toHaveText(/Start/);expect(errors).toEqual([]);
});

for(const width of [390,1440])test(`accepted120 offline proof fields stay inert at ${width}px`,async({page},testInfo)=>{
 const data=JSON.parse(await readFile(new URL('../../docs/mechanics/register.json',import.meta.url),'utf8')) as MechanicsRegister;
 const payload='" \' & </script><img src=x onerror="window.__registerInjected=1"> [link](javascript:bad)';
 Object.assign(data.acceptedProofs.find(p=>p.pr===120)!,{tree:payload,reviewedTree:payload,sourceProofBase:payload,receiptKind:payload});await expect(validateRegister(data)).rejects.toThrow();
 const file=testInfo.outputPath('refused120.html');await writeFile(file,renderHtml(data));await page.context().setOffline(true);await page.setViewportSize({width,height:1000});
 await page.goto(`${pathToFileURL(file).href}#proof-120`);await expect(page.locator('#proof-120')).toContainText(payload);await expect(page.locator('img,[onerror]')).toHaveCount(0);await expect(page.locator('script')).toHaveCount(2);expect(await page.evaluate(()=>Reflect.get(window,'__registerInjected'))).toBeUndefined();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export register JSON'}).click();expect(JSON.parse(await readFile((await(await download).path())!,'utf8'))).toEqual(data);
});


for (const width of [390,1440]) test(`accepted122 register and actual v19 admission controls at ${width}px`, async ({page},testInfo) => {
  await page.setViewportSize({width,height:1000});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/docs/mechanics/index.html#t43-source-timeout');
  await expect(page.locator('#t43-source-timeout .badge')).toHaveText('playable');
  await expect(page.locator('#t43-source-timeout')).toContainText('UNKNOWN/OPEN');
  await page.locator('#t43-source-timeout').getByRole('link',{name:'Runnable entry / controls'}).focus();await page.keyboard.press('Enter');
  const entry=page.locator('#scenario-source-timeout');
  for (const text of ['Enable original 99-unit timeout','Apply team to Training43','fresh PAUSED tick zero','[1,3,0,5]','[0,0,3,4]','Save progress','Load progress']) await expect(entry).toContainText(text);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await entry.screenshot({path:testInfo.outputPath(`v19-controls-${width}.png`)});
  await entry.getByRole('link',{name:'Instructions & limitations →'}).focus();await page.keyboard.press('Enter');
  await expect(page.locator('body')).toContainText('PR122 is accepted');await expect(page.locator('body')).toContainText('8ms target is not a universal bound');
  await page.goto('/docs/mechanics/index.html#proof-122');
  for(const text of ['07126bf9a65a38fb15d3c4f75b6f915ad134b611','6f28744d18198aa929c042d9ca2041ee816e22f1','source-proof base (PR120)','6534702086']) await expect(page.locator('#proof-122')).toContainText(text);
  await page.goto('/');await expect(page.getByRole('button',{name:'Enable original 99-unit timeout',exact:true})).toBeDisabled();
  await expect(page.locator('#training-timeout')).toContainText('Choose four different characters');await expect(page.locator('#training-timeout')).toContainText('fresh PAUSED tick zero');
  await expect(page.locator('#training-timeout')).toContainText('All dead takes priority, then timeout, then exit');
  await page.locator('#roster-panel > summary').focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Apply team to Training43',exact:true})).toBeDisabled();
  expect(errors).toEqual([]);
});

for (const width of [390,1440]) test(`accepted122 canonical offline proof lineage and hostile preview at ${width}px`, async ({page},testInfo)=>{
  const data=JSON.parse(await readFile(new URL('../../docs/mechanics/register.json',import.meta.url),'utf8')) as MechanicsRegister;
  await page.setViewportSize({width,height:1000});await page.context().setOffline(true);const requests:string[]=[],errors:string[]=[];
  page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
  const file=new URL('../../docs/mechanics/index.html',import.meta.url);await page.goto(`${file.href}#t43-source-timeout`);
  await expect(page.locator('#t43-source-timeout')).toContainText('Legacy1–18');await expect(page.locator('#register-completion')).toContainText('9.9%');
  const payload='" & </script><img src=x onerror="window.__registerInjected=1"> [link](javascript:bad)';
  Object.assign(data.acceptedProofs.find(p=>p.pr===122)!,{tree:payload,reviewedTree:payload,sourceProofBase:payload,receiptKind:payload});await expect(validateRegister(data)).rejects.toThrow();
  const hostile=testInfo.outputPath('refused122.html');await writeFile(hostile,renderHtml(data));await page.goto(`${pathToFileURL(hostile).href}#proof-122`);
  await expect(page.locator('#proof-122')).toContainText(payload);await expect(page.locator('img,[onerror]')).toHaveCount(0);await expect(page.locator('script')).toHaveCount(2);
  expect(await page.evaluate(()=>Reflect.get(window,'__registerInjected'))).toBeUndefined();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export register JSON'}).click();expect(JSON.parse(await readFile((await(await download).path())!,'utf8'))).toEqual(data);
  expect(requests).toEqual([]);expect(errors).toEqual([]);
});

for(const width of [390,1440])test(`accepted124 links and actual sign control semantics at ${width}px`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:1000});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/docs/mechanics/index.html#t43-sign-view');
  await expect(page.locator('#t43-sign-view .badge')).toHaveText('playable');
  await expect(page.locator('#t43-sign-view')).toContainText('UNKNOWN/OPEN');
  await page.locator('#t43-sign-view').getByRole('link',{name:'Runnable entry / controls'}).focus();await page.keyboard.press('Enter');
  const entry=page.locator('#scenario-sign-view');
  for(const text of ['Apply team to Training43','Enable original 99-unit timeout','fresh PAUSED tick zero','[1,3,0,5]','Retry','Save progress / Load progress','not original text'])await expect(entry).toContainText(text);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await entry.screenshot({path:testInfo.outputPath(`sign-controls-${width}.png`)});
  await entry.getByRole('link',{name:'Instructions & limitations →'}).click();await expect(page.locator('body')).toContainText('Accepted124 proof');
  await page.goto('/docs/mechanics/index.html#proof-124');
  for(const text of ['b35ab9f0609cf667df966e48db57a8dacda10f44','84a00052bdeaf50fac006325674b7a48a00fd4bd','source-proof base (PR122)','6535904450','no separate receipt comment observed'])await expect(page.locator('#proof-124')).toContainText(text);
  await page.goto('/');await expect(page.getByRole('button',{name:'Enable original 99-unit timeout',exact:true})).toBeDisabled();
  await expect(page.locator('#training-timeout')).toContainText('fresh PAUSED tick zero');
  await expect(page.locator('[id^="sign-"]')).toHaveCount(4);
  await expect(page.locator('[id^="sign-"]:visible')).toHaveCount(0);
  expect(errors).toEqual([]);
});

for(const width of [390,1440])test(`accepted124 offline export, hostile fields and live positive controls at ${width}px`,async({page},testInfo)=>{
  const data=JSON.parse(await readFile(new URL('../../docs/mechanics/register.json',import.meta.url),'utf8')) as MechanicsRegister;
  await page.setViewportSize({width,height:1000});await page.context().setOffline(true);const requests:string[]=[],errors:string[]=[];
  page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${new URL('../../docs/mechanics/index.html',import.meta.url).href}#proof-124`);
  await expect(page.locator('#proof-124')).toContainText('6535904450');
  let download=page.waitForEvent('download');await page.getByRole('button',{name:'Export register JSON'}).click();expect(JSON.parse(await readFile((await(await download).path())!,'utf8'))).toEqual(data);
  const payload='" & </script><img src=x onerror="window.__registerInjected=1"> [link](javascript:bad)';
  Object.assign(data.acceptedProofs.find(p=>p.pr===124)!,{tree:payload,reviewedTree:payload,sourceProofBase:payload,receiptKind:payload});await expect(validateRegister(data)).rejects.toThrow();
  const file=testInfo.outputPath('refused124.html');await writeFile(file,renderHtml(data));await page.goto(`${pathToFileURL(file).href}#proof-124`);
  await expect(page.locator('#proof-124')).toContainText(payload);await expect(page.locator('img,[onerror]')).toHaveCount(0);await expect(page.locator('script')).toHaveCount(2);
  expect(await page.evaluate(()=>{let reads=0;const live={get value(){reads++;return true;}};return {value:live.value,reads,injected:Reflect.get(window,'__registerInjected')};})).toEqual({value:true,reads:1,injected:undefined});
  download=page.waitForEvent('download');await page.getByRole('button',{name:'Export register JSON'}).focus();await page.keyboard.press('Enter');expect(JSON.parse(await readFile((await(await download).path())!,'utf8'))).toEqual(data);
  await page.getByRole('link',{name:'02 · Mechanics register'}).click();await page.getByRole('searchbox',{name:'Find a mechanic'}).fill('no-such-mechanic124');await expect(page.locator('#no-results')).toBeVisible();
  expect(requests).toEqual([]);expect(errors).toEqual([]);
});


for(const width of [390,1440])test(`accepted126 controls and same-tree receipt at ${width}px`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:1000});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/docs/mechanics/index.html#cap-corpse-pickup');
 await expect(page.locator('#cap-corpse-pickup')).toContainText('one current-cell');
 await expect(page.locator('#t43-corpse-pickup')).toContainText('EMPTY hands');
 await page.goto('/docs/mechanics/index.html#scenario-corpse-pickup');const entry=page.locator('#scenario-corpse-pickup');
 for(const text of ['Enable corpse-item pickup (original99)','G once','Save progress / Load progress','Retry','both action rules'])await expect(entry).toContainText(text);
 await page.screenshot({path:testInfo.outputPath(`corpse-controls-${width}.png`)});
 await entry.getByRole('link',{name:'Instructions & limitations →'}).click();await expect(page.locator('body')).toContainText('Accepted126 bounded equipment pickup');
 await page.goto('/docs/mechanics/index.html#proof-126');
 for(const text of ['139dd370a6f559dc2a4ce7c91480460b6e175ae6','source-proof base (PR125)','9940b3c318d358b0c9b3bfde9ee90013710d6fc4','6537386819','no separate receipt comment observed'])await expect(page.locator('#proof-126')).toContainText(text);
 expect(errors).toEqual([]);
});

for(const width of [390,1440])test(`accepted126 offline hostile proof export at ${width}px`,async({page},testInfo)=>{
 const data=JSON.parse(await readFile(new URL('../../docs/mechanics/register.json',import.meta.url),'utf8')) as MechanicsRegister;
 await page.setViewportSize({width,height:1000});await page.context().setOffline(true);const requests:string[]=[],errors:string[]=[];
 page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${new URL('../../docs/mechanics/index.html',import.meta.url).href}#proof-126`);
 let download=page.waitForEvent('download');await page.getByRole('button',{name:'Export register JSON'}).click();expect(JSON.parse(await readFile((await(await download).path())!,'utf8'))).toEqual(data);
 const hostile='" & </script><img src=x onerror="window.__registerInjected=1"> [link](javascript:bad)';
 Object.assign(data.acceptedProofs.find(p=>p.pr===126)!,{tree:hostile,reviewedTree:hostile,sourceProofBase:hostile,receiptKind:hostile});await expect(validateRegister(data)).rejects.toThrow();
 const file=testInfo.outputPath('refused126.html');await writeFile(file,renderHtml(data));await page.goto(`${pathToFileURL(file).href}#proof-126`);
 await expect(page.locator('#proof-126')).toContainText(hostile);await expect(page.locator('img,[onerror]')).toHaveCount(0);await expect(page.locator('script')).toHaveCount(2);
 expect(await page.evaluate(()=>{let reads=0;const live={get value(){reads++;return true;}};return {value:live.value,reads,injected:Reflect.get(window,'__registerInjected')};})).toEqual({value:true,reads:1,injected:undefined});
 download=page.waitForEvent('download');await page.getByRole('button',{name:'Export register JSON'}).focus();await page.keyboard.press('Enter');expect(JSON.parse(await readFile((await(await download).path())!,'utf8'))).toEqual(data);
 expect(requests).toEqual([]);expect(errors).toEqual([]);
});
