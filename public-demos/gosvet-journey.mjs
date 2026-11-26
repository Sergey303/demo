import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
assert(process.argv[2], 'Pass path to built GosVet index.html');
const html=await readFile(process.argv[2]);
const server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html)});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1440,height:900}});
page.setDefaultTimeout(3500);
const url='http://127.0.0.1:'+server.address().port+'/';
const errors=[]; let failures=0;
page.on('pageerror',e=>errors.push(e.message));
const result=(id,pass,detail)=>{if(!pass)failures++;console.log(JSON.stringify({id,pass,detail}));};
async function check(id,fn){try{const s=await fn();result(id,true,s)}catch(e){result(id,false,e.message.slice(0,350))}}
const button=(name)=>page.getByRole('button',{name,exact:true});
async function reset(){await page.goto(url+'#/demo-settings');page.once('dialog',d=>d.accept());await button('Сбросить демо').click();}
async function go(path){await page.goto(url+'#'+path);await page.waitForTimeout(100)}
async function search(q){await go('/search');await page.getByPlaceholder('Телефон, кличка, чип, владелец').fill(q);}
async function startVisit(reason='Вакцинация'){await button('Начать новый приём').click();await page.getByRole('dialog').getByRole('button',{name:reason,exact:true}).click();await button('Создать приём').click();}
async function fillSoap(){for(const [i,v] of ['Учебный анамнез','Учебное наблюдение','Учебная оценка','Учебный план'].entries())await page.locator('textarea').nth(i).fill(v)}
async function vaccine(){
 await button('Добавить прививку').click();
 const form=page.locator('.vaccination-new-editor');
 await form.locator('input').nth(0).fill('Рабифел');
 await form.locator('input').nth(1).fill('DEMO-001');
 await form.locator('input').nth(2).fill('31.12.2027');
 await form.locator('input').nth(2).press('Tab');
 await button('Подтвердить').click();
 await form.waitFor({state:'detached'});
}
async function complete(){let message='';page.once('dialog',async d=>{message=d.message();await d.accept()});await button('Завершить приём').click();return message;}
try{
 await reset();
 await check('G01-first-screen',async()=>{await go('/appointments/today');assert(await button('Открыть').count()>0,'После сброса на сегодня нет ни одного приёма');return 'Сегодня показаны записи'});
 await check('G02-seed-date',async()=>{await page.getByRole('button',{name:/^Пример:/}).click();assert.equal(await button('Открыть').count(),2);return 'Два приёма на дате образца'});
 await check('G03-search-four-keys',async()=>{for(const q of ['Барсик','Иванова','RU-1001','+70000000001']){await search(q);assert.equal(await button('Начать новый приём').count(),1,q)}return 'Четыре ключа поиска'});
 await check('G04-phone-format',async()=>{await search('+7 (000) 000-00-01');assert.equal(await button('Начать новый приём').count(),1,'Форматированный телефон не находится');return 'Телефон нормализуется'});
 await check('G05-empty-search',async()=>{await search('Несуществующее животное');assert.equal(await button('Начать новый приём').count(),0);assert(!(await page.locator('body').innerText()).includes('Можно создать запись без тупика'),'Обещано создание записи, но кнопки нет');return 'Честное пустое состояние'});
 await check('G06-search-start',async()=>{await search('Рекс');await startVisit('Контрольный осмотр');assert((await page.locator('body').innerText()).includes('Причина: Контрольный осмотр'),'Поиск автоматически создаёт «Вакцинация» без выбора причины');return 'Причина выбирается'});
 await check('G07-ordinary-completion',async()=>{await go('/appointment/demo-002');await fillSoap();const msg=await complete();assert(!msg.includes('будет отправлен в ВЕТИС'),'Подтверждение ошибочно обещает отправку: '+msg);return msg});
 await check('G08-ordinary-read-only',async()=>{assert(await page.locator('textarea').first().isDisabled());assert.equal(await button('Завершить приём').count(),0);return 'Поля закрыты'});
 await check('G09-delete-completed',async()=>{assert.equal(await button('Удалить приём').count(),0,'У завершённого приёма доступна кнопка удаления');return 'Защита завершённого'});
 await check('G10-vaccine-required',async()=>{await go('/appointment/demo-001');await vaccine();assert(await button('Завершить приём').isDisabled(),'Пустая SOAP не блокирует');return 'Подтверждённая прививка требует SOAP'});
 await check('G11-vaccine-first-send',async()=>{await fillSoap();await complete();await page.getByText('отправлено',{exact:true}).first().waitFor({timeout:12000});return 'Первая отправка успешна (симуляция)'});
 await check('G12-second-send',async()=>{await search('Барсик');await startVisit();await vaccine();await fillSoap();await complete();await page.getByText('отправлено',{exact:true}).first().waitFor({timeout:12000});return 'Вторая успешна'});
 await check('G13-third-send-rejected',async()=>{await search('Барсик');await startVisit();await vaccine();await fillSoap();await complete();await page.getByText('ошибка заполнения',{exact:true}).first().waitFor({timeout:12000});assert((await page.locator('body').innerText()).includes('В плане назначений не указано'));return 'Третья отправка отклонена по плану'});
 await check('G14-attention-reopen-error',async()=>{await go('/attention');await button('Исправить и отправить').click();await page.waitForTimeout(300);assert((await page.locator('body').innerText()).includes('В плане назначений не указано'),'При открытии из списка ошибок сообщение внешней системы исчезло');return 'Ошибка сохранена'});
 await check('G15-retry-after-fix',async()=>{await page.locator('textarea').nth(3).fill('Учебный исправленный план');await button('Отправить повторно').click();await page.getByText('отправлено',{exact:true}).first().waitFor({timeout:12000});return 'Повторная отправка успешна'});
 console.log('PAGE ERRORS',JSON.stringify(errors));
}finally{await browser.close();await new Promise(r=>server.close(r))}
if(failures||errors.length)process.exitCode=1;
