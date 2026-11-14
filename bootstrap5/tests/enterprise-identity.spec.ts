import { expect, test, type Page } from '@playwright/test';

const job='57feacc4-0ddd-4e88-b719-1f9e35d4c190';
const doc='863f223e-bf4d-4a91-bdd3-00421f2529a1';
const marker='ALICE_PRIVATE_REVIEW_MARKER';
const quote=`Customers may request a refund within 30 days for ${marker}.`;
const citation={job_id:doc,kind:'document',source:'policy.md',quote,char_start:0,char_end:quote.length,score:.91};
const approval='4f3396bf-b174-4be9-985b-42881a755fe7.'+'a'.repeat(43);
const agent=(pending=false)=>({mode:'mcp_agent',model:'qwen3:8b',semantic_verified:false,
  status:pending?'approval_required':'answered',answer:quote,citations:[citation],tool_trace:[],
  ...(pending?{pending:{approval_id:approval.split('.')[0],approval_token:approval,job_id:doc,note:quote}}:{})});
function held() { let release!:()=>void; const wait=new Promise<void>(r=>{release=r;}); return {wait,release:()=>release()}; }
async function focus(page:Page) { await page.evaluate(()=>window.dispatchEvent(new Event('focus'))); }
async function setup(page:Page) {
  const profile={subject:'alice',status:200};
  await page.route('**/enterprise-search/agent/identity',route=>route.fulfill(profile.status===200
    ? {json:{tenant:'review-team',subject:profile.subject,identity_kind:'local_demo'}}
    : {status:profile.status,json:{detail:'Unauthorized'}}));
  await page.route('**/enterprise-api/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/ready'))return route.fulfill({json:{status:'ready'}});
    if(path.endsWith('/audio-jobs'))return route.fulfill({status:202,json:{id:job}});
    if(path.endsWith('/document-jobs'))return route.fulfill({status:202,json:{id:doc}});
    return route.fulfill({json:{id:path.endsWith(job)?job:doc,status:'done',result:{source:'private',segments:[path.endsWith(job)
      ? {source:'private.wav',text:quote,start:0,end:2}
      : {source:'private.md',text:quote,chunk_index:0,char_start:0,char_end:quote.length}]}}});
  });
  await page.route('**/enterprise-search/search',route=>route.fulfill({json:{hits:[{...citation,text:quote}],abstained:false}}));
  await page.route('**/enterprise-search/answer',route=>{
    const generated=route.request().postDataJSON().mode==='generated';
    return route.fulfill({json:{mode:generated?'generated':'evidence',...(generated?{model:'qwen3:8b'}:{}),
      semantic_verified:false,abstained:false,reason:'verbatim_authorized_source_excerpts',answer:quote,citations:[citation]}});
  });
  await page.route('**/enterprise-search/agent/run',route=>route.fulfill({json:agent(true)}));
  return profile;
}
async function privateContent(page:Page,generated:boolean) {
  await page.goto('/dashboard/enterprise-ai');
  await expect(page.getByTestId('mcp-identity')).toContainText('alice');
  const wav=Buffer.alloc(48);wav.write('RIFF');wav.write('WAVE',8);
  await page.locator('#enterprise-wav').setInputFiles({name:'private.wav',mimeType:'audio/wav',buffer:wav});
  await page.getByRole('button',{name:'Отправить WAV',exact:true}).click();
  await expect(page.getByTestId('enterprise-job-status')).toHaveText('done');
  await page.locator('#enterprise-document-file').setInputFiles({name:'private.md',mimeType:'text/markdown',buffer:Buffer.from(quote)});
  await page.getByRole('button',{name:'Индексировать документ',exact:true}).click();
  await expect(page.getByTestId('document-result')).toContainText(marker);
  await page.locator('#enterprise-search-question').fill('refund');
  await page.getByRole('button',{name:'Найти доказательства',exact:true}).click();
  await expect(page.getByTestId('search-evidence')).toContainText(marker);
  await page.getByRole('button',{name:generated?'Сформировать ответ Qwen3 (локально)':'Ответить дословными цитатами',exact:true}).click();
  await expect(page.getByTestId('answer-text')).toContainText(marker);
  await page.locator('#mcp-task').fill('refund');
  await page.getByRole('button',{name:'Подготовить заметку для подтверждения',exact:true}).click();
  await expect(page.getByTestId('mcp-approval')).toContainText(marker);
}
for(const generated of [false,true]) {
  test(`page-wide changed identity clears audio, document, search, ${generated?'generated':'exact'} answer and approval`,async({page})=>{
    const profile=await setup(page);await privateContent(page,generated);
    const previousKey=await page.locator('#enterprise-key').inputValue();
    profile.subject='bob';await focus(page);
    await expect(page.getByTestId('mcp-identity')).toContainText('bob');
    await expect(page.locator('body')).not.toContainText(marker);
    await expect(page.getByTestId('enterprise-job-id')).toHaveCount(0);
    await expect(page.getByTestId('document-result')).toHaveCount(0);
    await expect(page.getByTestId('mcp-approval')).toHaveCount(0);
    await expect(page.locator('#enterprise-wav')).toHaveValue('');
    await expect(page.locator('#enterprise-key')).not.toHaveValue(previousKey);
    await expect(page.locator('#enterprise-document-file')).toHaveValue('');
    await expect(page.locator('#enterprise-search-question')).toHaveValue('');
  });
}
test('identity 401 clears all private content and gates actions',async({page})=>{
  const profile=await setup(page);await privateContent(page,true);
  profile.status=401;await focus(page);
  await expect(page.locator('body')).not.toContainText(marker);
  await expect(page.getByTestId('mcp-agent')).toHaveCount(0);
  await expect(page.locator('#enterprise-wav')).toHaveCount(0);
  await expect(page.getByTestId('enterprise-identity')).toContainText('не подтверждена');
});
for(const failure of ['held','network','invalid']) {
  test(`initial ${failure} identity never exposes user actions`,async({page})=>{
    const gate=held();let calls=0;
    await page.route('**/enterprise-search/agent/identity',async route=>{
      if(failure==='held'){await gate.wait;await route.fulfill({status:401});}
      else if(failure==='network')await route.abort();
      else await route.fulfill({json:{tenant:'forged',subject:'alice',identity_kind:'unknown'}});
    });
    await page.route('**/enterprise-search/agent/run',route=>{calls++;return route.abort();});
    await page.goto('/dashboard/enterprise-ai');
    await expect(page.locator('#enterprise-wav')).toHaveCount(0);
    await expect(page.getByTestId('enterprise-unified-search')).toHaveCount(0);
    await expect(page.getByTestId('mcp-agent')).toHaveCount(0);
    expect(calls).toBe(0);gate.release();
  });
}
test('late old search response cannot reappear after Bob verification',async({page})=>{
  const profile=await setup(page);const gate=held();
  await page.route('**/enterprise-search/search',async route=>{await gate.wait;await route.fulfill({json:{hits:[{...citation,text:quote}],abstained:false}});});
  await page.goto('/dashboard/enterprise-ai');
  await page.locator('#enterprise-search-question').fill('refund');
  const sent=page.waitForRequest('**/enterprise-search/search');
  await page.getByRole('button',{name:'Найти доказательства',exact:true}).click();await sent;
  profile.subject='bob';await focus(page);
  await expect(page.getByTestId('mcp-identity')).toContainText('bob');gate.release();
  await expect(page.getByTestId('search-evidence')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(marker);
});
test('same-principal focus preserves pending agent run and rendered result',async({page})=>{
  await setup(page);const gate=held();
  await page.route('**/enterprise-search/agent/run',async route=>{await gate.wait;await route.fulfill({json:agent()});});
  await page.goto('/dashboard/enterprise-ai');
  await page.locator('#mcp-task').fill('refund');
  const sent=page.waitForRequest('**/enterprise-search/agent/run');
  await page.getByRole('button',{name:'Спросить через MCP',exact:true}).click();await sent;
  const checked=page.waitForResponse('**/enterprise-search/agent/identity');await focus(page);await checked;
  gate.release();await expect(page.getByTestId('mcp-answer')).toHaveText(quote);
  await focus(page);await expect(page.getByTestId('mcp-answer')).toHaveText(quote);
});
test('same-principal focus preserves pending confirm, written success, and one use',async({page})=>{
  await setup(page);const gate=held();let confirms=0;
  await page.route('**/enterprise-search/agent/confirm',async route=>{confirms++;await gate.wait;await route.fulfill({json:{status:'written',note_id:job}});});
  await page.goto('/dashboard/enterprise-ai');await page.locator('#mcp-task').fill('refund');
  await page.getByRole('button',{name:'Подготовить заметку для подтверждения',exact:true}).click();
  await expect(page.getByTestId('mcp-approval')).toBeVisible();
  const sent=page.waitForRequest('**/enterprise-search/agent/confirm');
  await page.getByRole('button',{name:'Подтвердить запись',exact:true}).click();await sent;
  await expect(page.getByTestId('mcp-approval').locator('strong')).toContainText('результат пока неизвестен');
  const checked=page.waitForResponse('**/enterprise-search/agent/identity');await focus(page);await checked;
  gate.release();await expect(page.getByTestId('mcp-agent').getByRole('status')).toContainText('Заметка сохранена');
  await focus(page);await expect(page.getByTestId('mcp-agent').getByRole('status')).toContainText('Заметка сохранена');
  await expect(page.getByTestId('mcp-approval')).toHaveCount(0);expect(confirms).toBe(1);
});

test('cached search hits and pending approval survive same profile focus and clear on change',async({page})=>{
  const profile=await setup(page);await page.goto('/dashboard/enterprise-ai');
  await page.locator('#enterprise-search-question').fill('refund');
  await page.getByRole('button',{name:'Найти доказательства',exact:true}).click();
  await expect(page.getByTestId('search-evidence')).toContainText(marker);
  await page.locator('#mcp-task').fill('refund');
  await page.getByRole('button',{name:'Подготовить заметку для подтверждения',exact:true}).click();
  await expect(page.getByTestId('mcp-approval')).toBeVisible();
  const checked=page.waitForResponse('**/enterprise-search/agent/identity');await focus(page);await checked;
  await expect(page.getByTestId('search-evidence')).toContainText(marker);
  await expect(page.getByTestId('mcp-approval')).toBeVisible();
  profile.subject='bob';await focus(page);
  await expect(page.getByTestId('mcp-identity')).toContainText('bob');
  await expect(page.getByTestId('search-evidence')).toHaveCount(0);
  await expect(page.getByTestId('mcp-approval')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(marker);
});

for(const mode of ['search','answer','generated'] as const) {
  test(`late audio/document jobs, ${mode}, and agent replies are aborted across identity epoch`,async({page})=>{
    const profile=await setup(page);const gate=held();const aborted=new Set<string>();
    page.on('requestfailed',req=>{if(/enterprise-api\/jobs\/|enterprise-search\/(search|answer|agent\/run)$/.test(req.url()))aborted.add(req.url());});
    await page.route('**/enterprise-api/jobs/**',async route=>{
      await gate.wait;
      const audio=route.request().url().endsWith(job);
      await route.fulfill({json:{id:audio?job:doc,status:'done',result:{source:'private',segments:[audio
        ? {source:'private.wav',text:quote,start:0,end:2}
        : {source:'private.md',text:quote,chunk_index:0,char_start:0,char_end:quote.length}]}}});
    });
    await page.route(`**/enterprise-search/${mode==='search'?'search':'answer'}`,async route=>{
      await gate.wait;await route.fulfill({json:mode==='search'?{hits:[{...citation,text:quote}],abstained:false}
        :{mode:mode==='generated'?'generated':'evidence',...(mode==='generated'?{model:'qwen3:8b'}:{}),semantic_verified:false,abstained:false,reason:'verbatim_authorized_source_excerpts',answer:quote,citations:[citation]}});
    });
    await page.route('**/enterprise-search/agent/run',async route=>{await gate.wait;await route.fulfill({json:agent(true)});});
    await page.goto('/dashboard/enterprise-ai');
    const wav=Buffer.alloc(48);wav.write('RIFF');wav.write('WAVE',8);
    await page.locator('#enterprise-wav').setInputFiles({name:'private.wav',mimeType:'audio/wav',buffer:wav});
    let sent=page.waitForRequest(`**/enterprise-api/jobs/${job}`);
    await page.getByRole('button',{name:'Отправить WAV',exact:true}).click();await sent;
    await page.locator('#enterprise-document-file').setInputFiles({name:'private.md',mimeType:'text/markdown',buffer:Buffer.from(quote)});
    sent=page.waitForRequest(`**/enterprise-api/jobs/${doc}`);
    await page.getByRole('button',{name:'Индексировать документ',exact:true}).click();await sent;
    await page.locator('#enterprise-search-question').fill('refund');
    sent=page.waitForRequest(`**/enterprise-search/${mode==='search'?'search':'answer'}`);
    await page.getByRole('button',{name:mode==='search'?'Найти доказательства':mode==='answer'?'Ответить дословными цитатами':'Сформировать ответ Qwen3 (локально)',exact:true}).click();await sent;
    await page.locator('#mcp-task').fill('refund');sent=page.waitForRequest('**/enterprise-search/agent/run');
    await page.getByRole('button',{name:'Подготовить заметку для подтверждения',exact:true}).click();await sent;
    profile.subject='bob';await focus(page);
    await expect(page.getByTestId('mcp-identity')).toContainText('bob');
    // These real browser request failures prove invalidation before releasing old bodies.
    await expect.poll(()=>aborted.size).toBe(4);gate.release();
    await expect(page.locator('body')).not.toContainText(marker);
    await expect(page.getByTestId('enterprise-job-id')).toHaveCount(0);
    await expect(page.getByTestId('document-result')).toHaveCount(0);
    await expect(page.getByTestId('answer-result')).toHaveCount(0);
    await expect(page.getByTestId('search-evidence')).toHaveCount(0);
    await expect(page.getByTestId('mcp-result')).toHaveCount(0);
  });
}

test('identity transition during confirmation discards late success without replay or a no-commit claim',async({page})=>{
  const profile=await setup(page);const gate=held();let confirms=0;
  await page.route('**/enterprise-search/agent/confirm',async route=>{confirms++;await gate.wait;await route.fulfill({json:{status:'written',note_id:job}});});
  await page.goto('/dashboard/enterprise-ai');await page.locator('#mcp-task').fill('refund');
  await page.getByRole('button',{name:'Подготовить заметку для подтверждения',exact:true}).click();
  await expect(page.getByTestId('mcp-approval')).toBeVisible();
  const sent=page.waitForRequest('**/enterprise-search/agent/confirm');
  await page.getByRole('button',{name:'Подтвердить запись',exact:true}).click();await sent;
  await expect(page.getByTestId('mcp-approval').locator('strong')).toContainText('результат пока неизвестен');
  profile.subject='bob';await focus(page);await expect(page.getByTestId('mcp-identity')).toContainText('bob');
  gate.release();await expect(page.getByTestId('mcp-result')).toHaveCount(0);
  await expect(page.getByTestId('mcp-agent').getByRole('status')).toHaveCount(0);
  await expect(page.getByTestId('mcp-agent')).not.toContainText('Запись не создана');expect(confirms).toBe(1);
});
