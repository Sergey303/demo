import assert from 'node:assert/strict';
export async function reliableSmoke(page,base){
  const p=()=>page.locator('#rj-primary'),lane=()=>page.locator('#rj-lane-0');
  const has=async(sel,text)=>assert((await page.locator(sel).innerText()).includes(text),sel+' missing '+text);
  const press=async()=>p().click();
  const scenario=async(id,accept=true)=>{page.once('dialog',d=>accept?d.accept():d.dismiss());await page.locator('#rj-scenario').selectOption(id);};
  const tech=async()=>{if(!(await page.locator('#rj-tech').getAttribute('open')!==null))await page.locator('#rj-tech>summary').click();};
  await page.goto(base+'reliable-jobs/');
  for(const i of [0,1]){await has('#rj-lane-'+i,'Не отправлено');assert.equal(await page.locator('#rj-lane-'+i+' .rj-field').filter({hasText:'Принято записей'}).locator('strong').innerText(),'0');}
  await press();
  for(const i of [0,1]){await has('#rj-lane-'+i,'Подтверждение не получено');await has('#rj-lane-'+i,'Неизвестен');}
  await tech();assert.equal(await page.locator('#rj-state .rj-state p').filter({hasText:'jobs=1 / outbox=1 / results=0'}).count(),2);
  await page.locator('#rj-tech>summary').click();await has('#rj-progress','Шаг 1');
  await press();await has('#rj-lane-0','200 already-accepted · JOB-001');await has('#rj-lane-1','202 accepted · JOB-002');
  await press();await has('#rj-lane-0','результат ещё не проверен');await tech();await has('#rj-state','jobs=2 / outbox=2 / results=2');
  await press();await has('#rj-lane-0','результат проверен');await has('#rj-comparison','С защитой: записей 1, результатов 1. Без защиты: записей 2, результатов 2.');await has('#rj-lane-1','GET /jobs/JOB-002 → 200 · done');await has('#rj-state .rj-state:nth-child(1)','jobs=1 / outbox=1 / results=1');assert.equal(await page.locator('#rj-extras button').count(),0);
  assert.equal(await page.getByRole('link',{name:'Проверить одну вашу операцию',exact:true}).first().getAttribute('href'),'../../?service=release#contact');
  console.log('PASS RJ01–05, T01, comparison and CTA');
  const unchanged=await page.locator('#rj-state').innerText();await scenario('intake',false);assert.equal(await page.locator('#rj-state').innerText(),unchanged);assert.equal(await page.locator('#rj-scenario').inputValue(),'main');
  await scenario('intake');await press();await has('#rj-state','jobs=0 / outbox=0 / results=0');
  await press();await has('#rj-lane-0','202 accepted');await scenario('conflict');await press();
  const initial=await page.locator('#rj-state pre').first().innerText();
  await press();await has('#rj-lane-0','409 conflict');assert.equal(await page.locator('#rj-state pre').first().innerText(),initial);
  await press();await has('#rj-lane-0','200 already-accepted · JOB-001');
  await scenario('worker');await press();const prior=await page.locator('#rj-state pre').nth(1).innerText();
  await press();assert.equal(await page.locator('#rj-state pre').nth(1).innerText(),prior);await has('#rj-state','results=0');
  await page.getByText('Контракт и границы транзакций',{exact:true}).click();await has('#rj-tech','0/0 или 1/1');
  await press();await has('#rj-state','results=1');await has('#rj-state','"processed_at": 0');
  await press();const finished=await page.locator('#rj-state pre').first().innerText();
  await page.locator('#rj-reprocess').click();assert.equal(await page.locator('#rj-state pre').first().innerText(),finished);
  await page.locator('#rj-replay').focus();await page.keyboard.press('Enter');await has('#rj-lane-0','200 already-accepted');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'rj-terminalGet');await page.keyboard.press('Enter');await has('#rj-lane-0','200 · done');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'rj-newKey');await page.keyboard.press('Enter');await has('#rj-state','jobs=2 / outbox=2 / results=1');
  await page.keyboard.press('Enter');await has('#rj-lane-0','200 · queued');await has('#rj-hint','отдельную queued');
  assert.equal(await page.locator('#rj-extras button').count(),0);
  console.log('PASS RJ06–09, T02–04, T06 new key');
  await scenario('failures');await press();
  for(const [i,next] of [1,3,7,15].entries()){await press();await has('#rj-state','"attempts": '+(i+1));await has('#rj-state','"next_attempt_at": '+next);}
  await press();await has('#rj-state','"next_attempt_at": "max"');await has('#rj-state','"processed_at": null');
  await press();await has('#rj-lane-0','200 · failed');
  await page.locator('#rj-replay').click();await has('#rj-lane-0','200 already-accepted');await page.locator('#rj-terminalGet').click();
  await has('#rj-lane-0','200 · failed');assert(await p().isHidden());
  await page.locator('#rj-evidence>summary').click();
  assert.equal(await page.locator('#rj-matrix article').count(),10);
  for(const label of ['SOURCE','UNIT','PG-PRIMITIVE','HTTP-E2E','BROWSER-MODEL','NOT TESTED'])await has('#rj-matrix',label);
  for(const file of ['tests/smoke.py','tests/ConcurrencyIntegrationTests.cs','src/OutboxWorker.cs','src/JobLogic.cs','tests/JobLogicTests.cs','src/Program.cs','TECHNICAL-JOURNEY.md'])assert(await page.locator('#rj-matrix a[href$="'+file+'"]').count()>0);
  console.log('PASS RJ10–11, T05–07');
  await scenario('external');await press();await has('#rj-external','Требует проверки');assert(await p().isHidden());assert.equal(await page.locator('#rj-extras button').count(),0);
  await page.locator('#rj-tech>summary').click();await tech();await has('#rj-external','Требует проверки');
  await scenario('main');await page.setViewportSize({width:390,height:844});
  await p().focus();await page.keyboard.press('Enter');await has('#rj-lane-0','Неизвестен');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await tech();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#rj-tech>summary').focus();await page.keyboard.press('Enter');
  await page.locator('#rj-reset').click({trial:true});
  page.once('dialog',d=>d.accept());await page.locator('#rj-reset').click();await has('#rj-progress','Шаг 0');
  await page.setViewportSize({width:1280,height:900});
  console.log('PASS RJ12, T08 mobile keyboard and reset/cancel');
}
