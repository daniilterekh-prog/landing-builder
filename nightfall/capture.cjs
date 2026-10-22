/* Capture attributed visual references. No forms are submitted; no browser profile is reused. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/home/daniil/Documents/Codex/2026-10-11/firecrawl/work/web-capture-toolkit/node_modules/playwright');
const root=__dirname,refs=JSON.parse(fs.readFileSync(path.join(root,'../research/nightfall/2026-10-22-uae-landings/references.json')));
for(const d of ['captures','shots','thumbs'])fs.mkdirSync(path.join(root,d),{recursive:true});
const ids=(process.env.SOURCE_IDS||'').split(',').filter(Boolean).map(Number),selected=refs.filter((r,i)=>!ids.length||ids.includes(i+1));
const profiles={
 1:'.ScreenFrame,.StandardSectionWelcome,.FullyFurnishedWelcome,.PageIconicMortgage,.PageIconicVisaSectionWelcome,.PageContacts,.Footer,.Header',
 6:'.elementor-40937 > .elementor-element,.site-header,.site-footer',
 9:'body > .fw,body > .btw-wrap,body > footer',
 18:'body > .container,body > .hero,body > .binghatti-section,body > .milestone,body > .investment,body > .slider,body > .form-section,body > footer',
 21:"#headerMenu,body > div:nth-of-type(1) > section:nth-of-type(1),#project-overview-section,body > div:nth-of-type(1) > section:nth-of-type(3),#offplan-floor-plan-section,body > div:nth-of-type(1) > section:nth-of-type(5),#offplan-payment-plan-section,#offplan-amenities-section,body > div:nth-of-type(1) > section:nth-of-type(8),#offplan-location-section,body > div:nth-of-type(1) > section:nth-of-type(10),body > div:nth-of-type(1) > section:nth-of-type(11),body > div:nth-of-type(1) > section:nth-of-type(12),body > div:nth-of-type(1) > section:nth-of-type(13),body > div:nth-of-type(1) > section:nth-of-type(14),#about-us-section,body > div:nth-of-type(1) > section:nth-of-type(16),body > div:nth-of-type(1) > section:nth-of-type(17),body > div:nth-of-type(1) > section:nth-of-type(18),body > div:nth-of-type(1) > section:nth-of-type(19),body > div:nth-of-type(1) > footer:nth-of-type(1)",
 23:'body > header,main > .vstack > *,main > .vstack > .vstack > *,body > footer',
 25:'#main > form > main > *,#main main > section,#divSummary,#divOverview,#divFeatures,#divPaymentPlan,#divLocationMap,#divMasterPlan,#divFloorPlan,#divImageGallery',
 26:'#quiz-root',
 28:'.navbar-1,.page-wrap .section,.page-wrap .footer-1',
 29:'.navbar-1,.page-wrap .section,.page-wrap .footer-1',
 30:'header,.elementor-2905 > .elementor-element,.e-parent,footer'
};
function inventory(profile){
 const W=innerWidth,H=innerHeight;
 const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>=W*.55&&r.height>=45&&s.display!=='none'&&s.visibility!=='hidden'&&!e.closest('[role="dialog"],dialog,.modal,.popup,.modal-window,.cookie,.cookie-consent,[id*="Cookie"],#off-canvas,#mySidenav');};
 const area=e=>e.getBoundingClientRect();
 const css=e=>{if(e.id&&document.querySelectorAll('#'+CSS.escape(e.id)).length===1)return '#'+CSS.escape(e.id);let p=[],n=e;while(n&&n!==document.body){let same=[...n.parentElement.children].filter(x=>x.tagName===n.tagName);p.unshift(n.tagName.toLowerCase()+':nth-of-type('+(same.indexOf(n)+1)+')');if(n.parentElement.id&&document.querySelectorAll('#'+CSS.escape(n.parentElement.id)).length===1){p.unshift('#'+CSS.escape(n.parentElement.id));return p.join(' > ');}n=n.parentElement;}return 'body > '+p.join(' > ');};
 let nodes=[...document.querySelectorAll(profile||'header,footer,section,.t-rec,.section,[data-elementor-type="wp-page"] > .elementor-element,[data-elementor-type="single-post"] > .elementor-element')].filter(visible);
 // Elementor mixes sections and div containers; collect only top-level content containers.
 if(!profile)for(const e of document.querySelectorAll('[data-elementor-type] > .e-con,[data-elementor-type] > .elementor-section'))if(visible(e))nodes.push(e);
 nodes=[...new Set(nodes)].filter(e=>!nodes.some(a=>a!==e&&a.contains(e)&&area(a).height<2800&&!(e.tagName==='HEADER'&&area(e).height<250)));
 // Split oversized stacked sections at their own full-width layout containers when possible.
 function split(e){if(area(e).height<2800)return[e];let p=e;for(let k=0;k<4;k++){let c=[...p.children].filter(visible);if(c.length===1&&area(c[0]).height>area(p).height*.7){p=c[0];continue;}if(c.length>=2){let s=c.slice().sort((a,b)=>area(a).top-area(b).top);let overlap=s.some((x,i)=>i&&area(x).top<area(s[i-1]).bottom-150);if(!overlap&&s.reduce((a,x)=>a+area(x).height,0)>area(e).height*.6)return s.flatMap(x=>area(x).height>4500?split(x):[x]);}break;}return[e];}
 nodes=nodes.flatMap(split);nodes=[...new Set(nodes)].filter(visible);
 // Exclude banners consisting only of tracking widgets, cookie controls or spacer records.
 nodes=nodes.filter(e=>{const r=area(e),t=e.innerText.trim();return (t.length>3||e.querySelector('img,video,iframe,canvas')||getComputedStyle(e).backgroundImage!=='none')&&!(r.height<100&&t.length<8);});
 let blocks=nodes.map(e=>{let r=area(e),headings=[...e.querySelectorAll('h1,h2,h3')].filter(x=>x.getBoundingClientRect().height>0).map(x=>x.innerText.replace(/\s+/g,' ').trim()).filter(Boolean);let first=headings[0]||'';return {selector:css(e),tag:e.tagName,cls:typeof e.className==='string'?e.className:'',elementId:e.id,title:first.slice(0,140),headings:headings.slice(0,5),text:e.innerText.replace(/\s+/g,' ').trim().slice(0,420),y:Math.round(r.y+scrollY),height:Math.round(r.height),width:Math.round(r.width),h1Words:(e.querySelector('h1')?.innerText.trim().split(/\s+/)||[]).length};}).sort((a,b)=>a.y-b.y||(a.tag==='HEADER'?-1:1));
 // The first viewport is a separate composition even when the source has no semantic hero wrapper.
 if(!blocks.some(x=>x.y<500&&x.height>350))blocks.unshift({selector:'body',tag:'HERO',cls:'first-viewport',title:document.querySelector('h1')?.innerText.trim().slice(0,140)||document.title,text:'Первый экран страницы',y:0,height:H,width:W,viewportOnly:true,h1Words:(document.querySelector('h1')?.innerText.trim().split(/\s+/)||[]).length});
 return {url:location.href,title:document.title,height:document.documentElement.scrollHeight,blocks};
}
async function consent(p){const close=p.locator('.ComRivieraPopup.active .ComRivieraPopup__close');try{if(await close.isVisible())await close.click({timeout:1500});}catch{}for(const n of [/^Reject all$/i,/^Decline$/i,/^Accept all$/i,/^Accept cookies$/i,/^Allow all$/i,/^Accept$/i,/^Принять$/i]){const x=p.getByRole('button',{name:n}).first();try{if(await x.isVisible({timeout:300}))await x.click({timeout:1200});}catch{}}}
async function prepare(p){
 await p.waitForLoadState('load',{timeout:10000}).catch(()=>{});await p.waitForTimeout(1200);await p.evaluate(()=>Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,4000))]));await consent(p);
 // Native scroll loads lazy media and runs the source's IntersectionObservers.
 const h=await p.evaluate(()=>Math.min(60000,document.documentElement.scrollHeight));
 if(h>1000)for(let y=0;y<h;y+=900){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(75);}
 await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(350);
}
async function capture(p,r,mode){
const n=Number(r.id.slice(4)),size=mode==='desktop'?{width:1440,height:900}:{width:390,height:844};
let response=await p.goto(r.url,{waitUntil:'domcontentloaded',timeout:35000});await prepare(p);if(await p.evaluate(()=>document.documentElement.scrollHeight)>50000){response=await p.reload({waitUntil:'domcontentloaded',timeout:35000});await prepare(p);if(await p.evaluate(()=>document.documentElement.scrollHeight)>60000)throw Error('Source stylesheet did not settle: page exceeds 60000px.');}
if(n===10&&process.env.VIDEO_FRAME){const data='data:image/jpeg;base64,'+fs.readFileSync(process.env.VIDEO_FRAME).toString('base64');await p.locator('.section-welcome video').evaluate((e,data)=>{e.pause();e.removeAttribute('src');e.querySelectorAll('source').forEach(s=>s.remove());e.load();e.poster=data;},data);}
const title=await p.title();if(response.status()>=400||/Just a moment|Access Denied|Attention Required|Forbidden/i.test(title))throw Error('Source unavailable: HTTP '+response.status()+' '+title);
let data=await p.evaluate(inventory,profiles[n]||null);data.source=r.id;data.mode=mode;data.viewport=size;data.httpStatus=response.status();data.capturedAt=new Date().toISOString();
for(let i=0;i<data.blocks.length;i++){
 const x=data.blocks[i],loc=p.locator(x.selector).first(),stem=r.id.toLowerCase()+'-'+String(i+1).padStart(2,'0')+'-'+mode,file='shots/'+stem+'.jpg';
 try{
 if(!x.viewportOnly){await loc.evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.waitForTimeout(350);await loc.locator('img').evaluateAll(es=>Promise.race([Promise.all(es.map(i=>i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,1500))]));}
 else await p.evaluate(()=>scrollTo(0,0));
 const metrics=await loc.evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {height:Math.ceil(r.height),width:Math.ceil(r.width),opacity:s.opacity,visibility:s.visibility,images:[...e.querySelectorAll('img')].filter(i=>i.getBoundingClientRect().width>20).map(i=>({loaded:i.complete&&i.naturalWidth>0})),font:getComputedStyle(e.querySelector('h1,h2,h3')||e).fontFamily,fontSize:getComputedStyle(e.querySelector('h1,h2,h3')||e).fontSize};});
 if(!x.viewportOnly&&(metrics.height<30||metrics.visibility==='hidden'||metrics.opacity==='0')){x.state={status:'hidden',note:'Исходник скрывает этот блок на данной ширине.'};continue;}
 // No injected content: only suppress source cookie overlays while retaining the original composition.
 const opts={type:'jpeg',quality:77,timeout:15000,animations:'disabled',caret:'hide',style:'.cookie-consent,#CybotCookiebotDialog,.cky-consent-container,#onetrust-banner-sdk{visibility:hidden!important}'};
 if(x.viewportOnly)await p.screenshot({...opts,path:path.join(root,file)});else await loc.screenshot({...opts,path:path.join(root,file)});
 x.state={status:'ok',rawFile:file,captureWidth:x.viewportOnly?size.width:metrics.width,captureHeight:x.viewportOnly?size.height:metrics.height,capturedAt:new Date().toISOString(),failedImages:metrics.images.filter(i=>!i.loaded).length,font:metrics.font,fontSize:metrics.fontSize,text:x.text,title:x.title,note:n===10&&x.cls.includes('section-welcome')&&process.env.VIDEO_FRAME?'Видеофон: стоп-кадр 00:08 исходного ролика. Браузер не декодирует видеодорожку.':x.height>3500?'Длинная секция исходного сайта; показана полностью по частям.':''};
 }catch(e){x.state={status:'error',note:e.message.split('\n')[0].slice(0,180)};}
}
return data;
}
(async()=>{let next=0;
async function worker(){while(next<selected.length){const r=selected[next++];let b;try{
const pending=['desktop','mobile'].filter(mode=>!fs.existsSync(path.join(root,'captures',r.id+'-'+mode+'.json'))||process.env.RECAPTURE);if(!pending.length)continue;
b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});const probe=await b.newPage(),ua=(await probe.evaluate(()=>navigator.userAgent)).replace('HeadlessChrome','Chrome');await probe.close();
for(const mode of pending){const dest=path.join(root,'captures',r.id+'-'+mode+'.json');const context=await b.newContext({viewport:mode==='desktop'?{width:1440,height:900}:{width:390,height:844},userAgent:ua,deviceScaleFactor:1,isMobile:mode==='mobile',hasTouch:mode==='mobile',reducedMotion:'reduce'}),p=await context.newPage();
try{const data=await capture(p,r,mode);fs.writeFileSync(dest,JSON.stringify(data,null,2));console.log(r.id,mode,data.blocks.length+' blocks',data.blocks.filter(x=>x.state.status==='ok').length+' captured',data.height+'px');}
catch(e){fs.writeFileSync(dest,JSON.stringify({source:r.id,mode,error:e.message,capturedAt:new Date().toISOString(),blocks:[]},null,2));console.log(r.id,mode,'ERROR',e.message.split('\n')[0].slice(0,140));}
finally{await context.close().catch(()=>{});}}
}catch(e){console.log(r.id,'BROWSER ERROR',e.message.split('\n')[0]);}finally{if(b)await b.close().catch(()=>{});}}}
await Promise.all(Array.from({length:Number(process.env.WORKERS||2)},()=>worker()));})().catch(e=>{console.error(e);process.exit(1)});
