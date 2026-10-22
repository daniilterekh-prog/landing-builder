'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/home/daniil/Documents/Codex/2026-10-11/firecrawl/work/web-capture-toolkit/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=__dirname,base=process.env.LIBRARY_URL||'http://127.0.0.1:8867/nightfall/';
(async()=>{
 const data=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'))),coverage=JSON.parse(fs.readFileSync(path.join(root,'coverage.json')));
 assert.equal(data.projects.length,30);assert.equal(coverage.length,30);assert.equal(new Set(data.variants.map(x=>x.id)).size,data.variants.length);
 assert(coverage.every(x=>['desktop','mobile'].every(m=>x.modes[m].status==='ok')), 'All 60 source views must have a capture report');
 for(const v of data.variants)for(const s of Object.values(v.states)){assert(s.status!=='pending','No pending placeholders');if(s.status==='ok'){assert(s.parts.length);for(const f of [...s.parts,{file:s.thumbnail}])assert(fs.existsSync(path.join(root,f.file)),f.file);}}
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']}),ctx=await b.newContext({viewport:{width:1440,height:1000}}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 fs.mkdirSync(path.join(root,'checks'),{recursive:true});
 await p.goto(base);await p.locator('.card').first().waitFor();assert.equal(await p.title(),'Nightfall · библиотека блоков ОАЭ');assert.equal(await p.locator('.family-button').count(),data.families.filter(f=>f.count).length);
 assert.equal(await p.locator('#project-filter option').count(),31);
 for(const f of data.families.filter(x=>x.count)){await p.locator('[data-family="'+f.id+'"]').click();assert.equal(await p.locator('.card').count(),f.count);}
 await p.locator('[data-family="hero"]').click();await p.locator('#source-filter').selectOption('ad');const adIds=await p.locator('.card').evaluateAll(es=>es.map(e=>e.dataset.id));assert(adIds.length>0);assert(adIds.every(id=>data.variants.find(v=>v.id===id).ad));
 await p.locator('#source-filter').selectOption('all');
 const first=p.locator('.card').filter({has:p.locator('.primary-choice:not([disabled])')}).first(),id=await first.getAttribute('data-id');await first.locator('.primary-choice').click();assert.equal(await p.locator('#selected-count').textContent(),'1');
 await p.locator('#family-note').fill('Nightfall: композиция первого варианта, свой текст.');
 await p.reload();await p.locator('.card').first().waitFor();assert.equal(await p.locator('#selected-count').textContent(),'1');assert((await p.locator('#family-note').inputValue()).includes('Nightfall'));
 assert(await p.evaluate(()=>localStorage.getItem('nightfall.uae.block-selection.v1')));assert.equal(await p.evaluate(()=>localStorage.getItem('barnes.altai.block-selection.projects.v2')),null);
 await p.locator('.card[data-id="'+id+'"] .shot-button').click();await p.locator('#viewer').waitFor({state:'visible'});assert.equal(await p.locator('#viewer .full-shot img').count(),data.variants.find(v=>v.id===id).states.desktop.parts.length);await p.keyboard.press('Escape');assert.equal(await p.locator('#viewer').isVisible(),false);
 await p.locator('.compare-choice input').nth(0).check();await p.locator('.compare-choice input').nth(1).check();await p.locator('#compare-open').click();assert.equal(await p.locator('.viewer-column').count(),2);await p.keyboard.press('Escape');await p.locator('#compare-clear').click();
 const dl=p.waitForEvent('download');await p.locator('#export').click();const download=await dl;const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(exported.libraryId,'nightfall-uae-v1');assert.equal(exported.primary.hero,id);
 await p.locator('#import').setInputFiles({name:'nightfall.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});assert((await p.locator('#save-status').textContent()).includes('загружен'));
 await p.locator('#import').setInputFiles({name:'other-library.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...exported,libraryId:'altai'}))});assert((await p.locator('#save-status').textContent()).includes('Не удалось'));assert.equal(await p.locator('#selected-count').textContent(),'1');
 await p.locator('#selection-tab').click();assert.equal(await p.locator('.selection-item').count(),1);await p.locator('#library-tab').click();
 await p.locator('#search').fill('NO_RESULT_123');assert.equal(await p.locator('#empty').isVisible(),true);await p.locator('#reset-filters').click();assert((await p.locator('.card').count())>0);
 await p.screenshot({path:path.join(root,'checks/desktop.jpg'),type:'jpeg',quality:85});
 for(const width of [390,768]){await p.setViewportSize({width,height:900});await p.locator('[data-mode="mobile"]').click();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page overflow at '+width);await p.locator('.card .shot-button').first().click();assert(await p.locator('#viewer').isVisible());await p.keyboard.press('Escape');if(width===390)await p.screenshot({path:path.join(root,'checks/mobile.jpg'),type:'jpeg',quality:85});}
 await p.goto(new URL('sources.html',base).href);assert.equal(await p.locator('tbody tr').count(),30);assert.equal(errors.length,0,errors.join('\n'));
 await b.close();const report={checkedAt:new Date().toISOString(),base,projects:30,categories:data.families.filter(x=>x.count).length,variants:data.variants.length,availableStates:data.variants.reduce((n,v)=>n+Object.values(v.states).filter(s=>s.status==='ok').length,0),checks:['all source reports','catalogue assets','all category counts','source filter','primary choice','notes persistence','independent storage','full viewer and Escape','comparison','JSON export/import','foreign import rejected','selection view','empty search/reset','390/768 overflow','30 source rows','no page errors']};fs.writeFileSync(path.join(root,'checks/report.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS',JSON.stringify(report));
})().catch(e=>{console.error(e);process.exit(1)});
