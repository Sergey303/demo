import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

assert(process.argv[2],'Pass the static build directory');
const root=resolve(process.argv[2]);
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.css':'text/css; charset=utf-8','.png':'image/png','.mp4':'video/mp4'};
const prefix='/nested/demos/';
const server=createServer(async(req,res)=>{
  try {
    const path=new URL(req.url,'http://localhost').pathname;
    if(!path.startsWith(prefix)) throw new Error('Outside mount');
    let f=resolve(root,decodeURIComponent(path.slice(prefix.length)));
    if(f!==root&&!f.startsWith(root+sep)) throw new Error('Outside root');
    if((await stat(f)).isDirectory())f=resolve(f,'index.html');
    const data=await readFile(f);res.writeHead(200,{'Content-Type':mime[extname(f)]||'application/octet-stream'});res.end(data);
  } catch {res.writeHead(404);res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port+prefix;
let browser;
try {
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  const unexpected=[],errors=[];
  await context.route('**/*',route=>{
    if(!route.request().url().startsWith(base)){unexpected.push(route.request().url());return route.abort();}
    return route.continue();
  });
  const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>{errors.push(String(e));console.error('PAGE ERROR',e.message)});page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
  const click=id=>page.locator('#'+id).click();
  const has=async(id,expected)=>{assert((await page.locator('#'+id).innerText()).includes(expected),id+' should include '+expected);};
  await page.goto(base);assert.equal(await page.getByRole('link',{name:'Открыть демо'}).count(),4);
  await page.goto(base+'appforge/');await has('count','3 активных');
  await page.locator('#name').fill('Smoke example');await page.locator('#segment').fill('B2B');await click('save');await has('count','4 активных');
  await page.locator('#search').fill('Smoke example');assert.equal(await page.locator('#rows tr').count(),1);
  await page.getByRole('button',{name:'Изменить'}).click();await page.locator('#name').fill('Edited example');await click('save');assert.equal(await page.locator('#rows tr').count(),0);
  await page.locator('#search').fill('Edited example');assert.equal(await page.locator('#rows tr').count(),1);
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Удалить'}).click();await has('count','3 активных');await click('reset');
  console.log('PASS AppForge simulator CRUD and reset');
  await page.getByRole('link',{name:'Открыть сгенерированный интерфейс'}).click();
  await page.getByText('Alfa Service (sample)',{exact:true}).first().waitFor();console.log('Generated seed loaded');
  await page.getByRole('button',{name:'Create Customer'}).click();
  await page.locator('#customer-name').fill('Generated smoke');
  await page.locator('#customer-segment').fill('SMB');
  await page.getByRole('button',{name:'Create',exact:true}).click();
  const generatedRow=page.getByRole('row').filter({hasText:'Generated smoke'});
  await generatedRow.waitFor().catch(async e=>{console.log('BODY', (await page.locator('body').innerText()).slice(0,4000)); throw e;});console.log('Generated created');
  await generatedRow.getByRole('button',{name:'Edit',exact:true}).click();
  await page.locator('#customer-name').fill('Generated edited');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  const editedRow=page.getByRole('row').filter({hasText:'Generated edited'});
  await editedRow.waitFor();console.log('Generated edited');
  await editedRow.getByRole('button',{name:'Delete',exact:true}).click();
  await editedRow.waitFor({state:'detached'});
  await page.getByRole('button',{name:'Сбросить демо'}).click();
  await page.getByText('Alfa Service (sample)',{exact:true}).first().waitFor();
  assert.equal(await page.getByRole('row').filter({hasText:'Generated edited'}).count(),0);
  console.log('PASS original generated AppForge React with local transport CRUD and reset');

  await page.goto(base+'reliable-jobs/');await click('submit');await has('log','202 · JOB-001');await click('submit');await has('log','200 · JOB-001');await page.locator('#payload').fill('changed');await click('submit');await has('log','409');await click('rollback');await has('jobs','попыток: 0');await click('success');await has('jobs','done');await click('reset');await click('submit');for(let i=0;i<5;i++)await click('failure');await has('jobs','failed');console.log('PASS Reliable Jobs simulator');
  await page.goto(base+'enterprise-ai/');await has('answer','within 30 days');await has('provenance','Qwen3');await page.locator('#doc').uncheck();assert.equal(await page.locator('#sources li').count(),1);await page.locator('#audio').uncheck();await has('answer','Нет разрешённых');assert.equal(await page.locator('#sources li').count(),0);await page.locator('#doc').check();await page.locator('#scenario').selectOption('unknown');assert.equal(await page.locator('#sources li').count(),0);assert.equal((await context.request.get(base+'enterprise-ai/qwen.mp4')).status(),200);console.log('PASS Enterprise replay and grants');
  await page.goto(base+'gosvet/');await page.getByRole('link',{name:'Открыть приём'}).click();await page.getByText('Демонстрационный прототип',{exact:false}).waitFor();await page.getByText('Прививки',{exact:true}).first().waitFor();await page.getByRole('link',{name:'Мои приёмы'}).click();await page.getByRole('button',{name:'Пример: 1 июня'}).click();await page.getByRole('button',{name:'Открыть',exact:true}).first().waitFor();await page.getByRole('link',{name:'Поиск',exact:true}).click();console.log('PASS GosVet real React navigation and seeded date');
  await page.setViewportSize({width:390,height:844});
  for(const p of ['', 'appforge/','reliable-jobs/','enterprise-ai/','gosvet/']){
    await page.goto(base+p);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Mobile overflow: '+p);
  }
  assert.deepEqual(errors,[],'Browser errors');assert.deepEqual(unexpected,[],'Unexpected network requests');console.log('PASS nested paths, mobile wrappers, no unexpected network and no browser errors');
} finally {await browser?.close();await new Promise(r=>server.close(r));}
