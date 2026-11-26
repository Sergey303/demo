import {newJobs,newAdmin,replay} from './model.mjs';
const $=id=>document.getElementById(id);
const node=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e};
const button=(text,fn)=>{const e=node('button',text);e.type='button';e.className='secondary';e.onclick=fn;return e};
function admin() {
  let store=newAdmin(), editing=0;
  const clear=()=>{editing=0;$('form').reset();$('save').textContent='Создать клиента';};
  function render() {
    const body=$('rows');body.replaceChildren();
    for(const x of store.list($('search').value)){
      const tr=node('tr','');for(const value of [x.id,x.name,x.email,x.segment])tr.append(node('td',value));
      const td=node('td','');td.append(button('Изменить',()=>{editing=x.id;$('name').value=x.name;$('email').value=x.email;$('segment').value=x.segment;$('save').textContent='Сохранить';$('name').focus()}),button('Удалить',()=>{if(confirm('Удалить демонстрационную запись?')){store.remove(x.id);if(editing===x.id)clear();render();$('message').textContent='Запись скрыта (soft delete, имитация).'}}));tr.append(td);body.append(tr);
    }
    $('count').textContent=store.list().length+' активных записей';
  }
  $('search').oninput=render;
  $('form').onsubmit=e=>{e.preventDefault();if(store.save({id:editing,name:$('name').value,email:$('email').value,segment:$('segment').value})){clear();render();$('message').textContent='Изменение сохранено в памяти браузера.';}else $('message').textContent='Проверьте поля.';};
  $('cancel').onclick=clear;$('reset').onclick=()=>{store=newAdmin();clear();$('search').value='';render();$('message').textContent='Исходные данные восстановлены.'};render();
}
function jobs(){
  let store=newJobs(),history=[];
  function show(message){history.unshift(message);$('log').textContent=history.slice(0,10).join('\n');$('jobs').replaceChildren(...store.list().map(j=>node('li',j.id+' · '+j.state+' · попыток: '+j.attempts+(j.words===undefined?'':' · слов: '+j.words))));}
  const key=()=>$('key').value;
  $('submit').onclick=()=>{const r=store.submit(key(),$('payload').value);show('POST /jobs → '+r.status+(r.job?' · '+r.job.id:''));};
  for(const action of ['rollback','failure','success'])$(action).onclick=()=>{const j=store.step(key(),action);show(j?action+' → '+j.id+' · '+j.state:'Нет ожидающей операции с этим ключом');};
  $('reset').onclick=()=>{store=newJobs();history=[];$('key').value='order-001';$('payload').value='alpha beta gamma';show('Сценарий сброшен.');};
}
function enterprise(){
  function run(){
    const grants=['doc','audio'].filter(x=>$(x).checked);
    const r=replay({grants,scenario:$('scenario').value,mode:$('mode').value});
    $('answer').textContent=r.answer;
    $('provenance').textContent=r.recorded?'Воспроизведение зафиксированного ответа Qwen3 (09.11.2026).':'Детерминированная демонстрация; модель не вызывается.';
    $('sources').replaceChildren(...r.sources.map(x=>{const e=node('li',x.title+' · '+x.location);e.append(node('blockquote',x.quote));return e;}));
  }
  $('run').onclick=run;for(const id of ['doc','audio','mode','scenario'])$(id).onchange=run;run();
}
({admin,jobs,enterprise}[document.body.dataset.demo]||(()=>{}))();
