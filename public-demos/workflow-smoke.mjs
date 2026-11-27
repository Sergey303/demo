import assert from 'node:assert/strict';

export async function workflowSmoke(page,base){
  const url=base+'appforge/workflow/';
  const button=(name)=>page.getByRole('button',{name,exact:true});
  const role=(name)=>button(name).click();
  const row=(name)=>page.getByRole('article',{name,exact:true});
  const open=(name,action='Открыть задачу')=>row(name).getByRole('button',{name:action,exact:true}).click();
  const feedback=(text)=>page.getByRole('status').filter({hasText:text}).waitFor();
  const confirm=(accept=true)=>page.once('dialog',dialog=>accept?dialog.accept():dialog.dismiss());
  const metrics=async(expected)=>{
    for(const [i,key] of ['open','empty','unassigned','complete'].entries()){
      await page.waitForFunction(([k,n])=>document.querySelector('[data-testid="metric-'+k+'"] strong')?.textContent?.trim().startsWith(String(n)+' '),[key,expected[i]]);
    }
  };
  const manager=()=>role('Руководитель');
  const dispatcher=()=>role('Диспетчер');
  async function executor(name){await role('Исполнитель');await page.locator('#profile').selectOption(name);}
  async function assign(name){await page.locator('#assignment').selectOption(name);await button('Сохранить назначение').click();await feedback('Назначение сохранено');}
  async function start(){await button('Начать работу').click();await feedback('Работа начата');}
  async function finish(text){await button('Завершить с результатом').click();await page.locator('#task-result').fill(text);await button('Подтвердить выполнение').click();await feedback('Работа выполнена');}
  async function reset(){confirm();await button('Сбросить демо').click();await page.getByRole('heading',{name:'Что требует внимания'}).waitFor();await metrics([3,1,1,1]);}
  async function newTask(title,assignee){await button('Добавить задачу').click();await page.locator('#task-title').fill(title);if(assignee)await page.locator('#task-person').selectOption(assignee);await button('Сохранить задачу').click();await feedback('Задача добавлена');}

  await page.goto(url);
  await page.getByRole('heading',{name:'Что требует внимания'}).waitFor();
  await metrics([3,1,1,1]);
  assert.equal(await page.getByRole('article',{name:'Проверка насоса'}).count(),1);
  // O01–O07 / M01–M02
  await dispatcher();await open('Согласование конфигурации','Назначить');
  assert((await page.locator('main').innerText()).includes('Север Проект'));
  await assign('Анна');await page.getByText('Новая',{exact:true}).waitFor();await manager();await metrics([3,1,0,1]);
  await executor('Анна');await row('Согласование конфигурации').waitFor();assert.equal(await row('Проверка запуска').count(),0);
  await open('Согласование конфигурации');await start();
  await button('Завершить с результатом').click();await page.locator('#task-result').fill('   ');
  await button('Подтвердить выполнение').click();
  await page.getByRole('alert').filter({hasText:'Укажите результат работы'}).waitFor();
  await button('Отмена').click();assert.equal(await page.getByText('В работе',{exact:true}).count(),1);await manager();await metrics([3,1,0,1]);await executor('Анна');await open('Согласование конфигурации');
  await finish('Конфигурация согласована');
  await manager();await metrics([2,1,0,2]);await button('Клиенты').click();
  await page.getByRole('article').filter({hasText:'Север Проект'}).getByRole('button',{name:'Открыть клиента'}).click();
  await page.getByText('Согласование конфигурации: Конфигурация согласована',{exact:true}).waitFor();
  // O08–O10 / M03–M04
  await dispatcher();await open('Проверка насоса','Добавить задачу');await newTask('Осмотр насоса','Илья');
  await manager();await metrics([2,0,0,2]);await executor('Илья');await row('Осмотр насоса').waitFor();await row('Проверка запуска').waitFor();
  assert.equal(await row('Согласование конфигурации').count(),0);
  await reset();
  // D01–D08 / O11: known customer, cancelled task, 2 task lifecycle
  await dispatcher();await button('Новая заявка').click();
  await page.locator('#request-customer').selectOption({label:'Альфа Сервис · Обслуживание · 0001'});
  await page.locator('#request-title').fill('Осмотр компрессора');await page.locator('#request-priority').selectOption('Высокий');
  await button('Сохранить заявку').click();await feedback('Заявка создана');
  await button('Добавить задачу').click();await page.locator('#task-title').fill('Отменённая');await button('Отмена').click();
  await page.getByText('У заявки пока нет задач',{exact:true}).waitFor();
  await newTask('Осмотр','Анна');await newTask('Согласование результата','Илья');
  await executor('Анна');await page.getByRole('article',{name:'Осмотр',exact:true}).filter({hasText:'Осмотр компрессора'}).getByRole('button',{name:'Открыть задачу'}).click();await start();await finish('Осмотр закончен');
  await manager();await metrics([4,1,1,1]);await executor('Илья');await open('Согласование результата');await start();await finish('Результат согласован');
  await manager();await metrics([3,1,1,2]);await button('Заявки').click();await page.getByRole('searchbox').fill('Осмотр компрессора');await row('Осмотр компрессора').waitFor();
  await open('Осмотр компрессора','Открыть заявку');await page.getByText('Работы выполнены',{exact:true}).waitFor();
  await page.getByText('Результат согласован',{exact:true}).waitFor();await button('← Альфа Сервис').click();await page.getByText('Согласование результата: Результат согласован',{exact:true}).waitFor();await page.getByText('Осмотр: Осмотр закончен',{exact:true}).waitFor();assert.equal(await page.getByText('Настройка контроллера',{exact:true}).count(),0);
  await reset();
  // O11 unknown customer preserves draft, validation & cancel; no unrelated records
  await dispatcher();await button('Новая заявка').click();await page.locator('#request-title').fill('Новая заявка клиента');
  await button('Нет клиента? Создать карточку').click();await page.locator('#client-name').fill('Учебный новый');await button('Сохранить клиента').click();await feedback('Карточка клиента сохранена');
  assert.equal(await page.locator('#request-title').inputValue(),'Новая заявка клиента');
  assert((await page.locator('#request-customer option:checked').innerText()).includes('Учебный новый'));
  await button('Сохранить заявку').click();await feedback('Заявка создана');
  await reset();
  // O12 public UI cannot expose invalid transitions; O13 reopen/cancel
  await dispatcher();await open('Согласование конфигурации','Назначить');
  assert.equal(await button('Начать работу').count(),0);
  await assign('Анна');await executor('Анна');await open('Согласование конфигурации');
  assert.equal(await button('Завершить с результатом').count(),0);
  await start();await finish('Конфигурация согласована');
  confirm(false);await button('Вернуть в работу').click();await page.getByText('Выполнена',{exact:true}).waitFor();
  confirm();await button('Вернуть в работу').click();await feedback('Задача возвращена в работу');
  await page.getByText('Конфигурация согласована',{exact:true}).waitFor();
  await manager();await metrics([3,1,0,1]);
  await reset();
  // O14 confirmation before adding a task to a completed request
  await page.getByTestId('metric-complete').click();await open('Диагностика привода','Открыть заявку');
  confirm(false);await button('Добавить задачу').click();assert.equal(await page.locator('#task-title').count(),0);assert.equal(await row('Диагностика').count(),1);await page.getByText('Работы выполнены',{exact:true}).waitFor();
  confirm();await button('Добавить задачу').click();await page.locator('#task-title').fill('Повторный контроль');
  await page.locator('#task-person').selectOption('Марина');
  await button('Сохранить задачу').dblclick();await feedback('Задача добавлена');
  assert.equal(await row('Повторный контроль').count(),1);
  await manager();await metrics([4,1,1,0]);
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth+1);
  await executor('Марина');await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth+1);await open('Повторный контроль');await start();await button('Завершить с результатом').click();await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth+1);await page.locator('#task-result').fill('Проверено на мобильном');await button('Отмена').click();
  await page.setViewportSize({width:1280,height:900});
  await page.reload();await metrics([3,1,1,1]);
  // D10 URL target is checked without navigating out of standalone package.
  const cta=page.getByRole('link',{name:'Обсудить вашу внутреннюю систему →'});
  assert(new URL(await cta.getAttribute('href'),page.url()).hash==='#contact');
  console.log('PASS P1 browser routes covering O01–O14/M01–M04/D01–D09; CTA target, mobile, reset, confirmations');
}
