import { useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { useNavigate } from "react-router-dom";
import { createAnimalAppointmentDraft } from "../app/appointmentFactory";
import { useDemoStore } from "../app/context";
import { compactAppointmentStatusText, searchReasonText } from "../entities/status";
import { formatAppointmentDate } from "../entities/appointmentDisplay";
import { filledSoapFields, searchDemoAnimals, type DemoSearchResult } from "../entities/demoSearch";

export function SearchPanel() {
  const { state, dispatch } = useDemoStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [newVisit,setNewVisit]=useState<DemoSearchResult|null>(null);
  const [reason,setReason]=useState("");
  const normalized=query.trim();
  const results=useMemo(()=>searchDemoAnimals(state.animals,state.owners,state.appointments,query,state.selectedClinicId),
    [query,state.animals,state.owners,state.appointments,state.selectedClinicId]);
  const handleStartAppointment=()=>{
    if(!newVisit||!reason.trim())return;
    const draft=createAnimalAppointmentDraft(state,newVisit.owner,newVisit.animal,reason);
    dispatch({type:"add_appointment",appointment:draft.appointment});
    setNewVisit(null);
    navigate(`/appointment/${draft.appointment.id}`);
  };
  const start=(result:DemoSearchResult)=>{setReason("");setNewVisit(result);};

  return (
    <Card title="Умный поиск" className="demo-search-card">
      <div className="stack">
        <div className="demo-search-controls">
          <label className="field" htmlFor="demo-animal-search">
            <span>Найти животное</span>
            <InputText id="demo-animal-search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Телефон, кличка, чип, владелец" />
          </label>
          {normalized && <Button label="Очистить поиск" icon="pi pi-times" text onClick={()=>setQuery("")}/>}
        </div>
        <div className="demo-search-intro" role="status">
          <strong>{normalized?"Результаты поиска":"Животные в демо"} · {results.length}</strong>
          {!normalized && <span>Выберите готовую карточку или откройте заполненный приём, чтобы познакомиться с системой.</span>}
        </div>
        {normalized && results.length===0 && <div className="demo-search-empty">Ничего не найдено. Измените запрос или очистите поиск, чтобы увидеть всех животных демо.</div>}
        {!normalized && results.length===0 && <div className="demo-search-empty">В демо пока нет животных.</div>}
        <div className="demo-animal-grid">
          {results.map(result=>(
            <article className="search-item demo-animal-card" key={result.animal.id} aria-label={result.animal.name}>
              <div className="demo-animal-heading">
                <div className="demo-animal-icon" aria-hidden="true"><i className="pi pi-heart"/></div>
                <div><strong>{result.animal.name}</strong><div className="search-owner">{result.animal.species} · чип {result.animal.chip}</div></div>
              </div>
              {result.reason && <small className="search-owner">{searchReasonText[result.reason]}</small>}
              <div className="search-owner"><strong>Владелец:</strong> {result.owner.fullName} · {result.owner.phone}</div>
              <div className="demo-animal-visits">
                <span>Приёмов в этой клинике: {result.visits.length}</span>
                {result.current && <div className="demo-visit-row"><div><strong>{result.current.reason}</strong><small>{formatAppointmentDate(result.current.startedAt)} · {compactAppointmentStatusText[result.current.status]} · {filledSoapFields(result.current)}/4 полей</small></div>
                  <Button label="Открыть приём" size="small" onClick={()=>navigate(`/appointment/${result.current!.id}`)}/></div>}
                {result.example && <div className="demo-visit-row demo-visit-example"><div><strong>Заполненный пример</strong><small>{result.example.reason} · {formatAppointmentDate(result.example.startedAt)} · {filledSoapFields(result.example)}/4 полей</small></div>
                  <Button label="Посмотреть пример" size="small" outlined onClick={()=>navigate(`/appointment/${result.example!.id}`)}/></div>}
                {!result.current&&!result.example && <small>Откройте историю или начните новый приём.</small>}
              </div>
              <div className="actions-row demo-animal-actions">
                <Button label="Страница животного" size="small" outlined onClick={()=>navigate(`/animal/${result.animal.id}`)}/>
                <Button label="Начать новый приём" size="small" text icon="pi pi-plus" onClick={()=>start(result)}/>
              </div>
            </article>
          ))}
        </div>
      </div>
      <Dialog header={newVisit?`Новый приём · ${newVisit.animal.name}`:"Новый приём"} visible={Boolean(newVisit)} onHide={()=>setNewVisit(null)}
        style={{width:"min(440px, calc(100vw - 24px))"}}>
        <form className="stack" onSubmit={event=>{event.preventDefault();handleStartAppointment();}}>
          <label className="field" htmlFor="search-visit-reason"><span>Причина обращения</span><InputText id="search-visit-reason" value={reason} onChange={event=>setReason(event.target.value)} placeholder="Например, контрольный осмотр" autoFocus/></label>
          <div className="actions-row">{["Контрольный осмотр","Вакцинация","Первичный осмотр"].map(value=><button key={value} type="button" className="clinical-tag" aria-pressed={reason===value} onClick={()=>setReason(value)}>{value}</button>)}</div>
          <div className="actions-row"><Button label="Отмена" type="button" outlined onClick={()=>setNewVisit(null)}/><Button label="Создать приём" type="submit" disabled={!reason.trim()}/></div>
        </form>
      </Dialog>
    </Card>
  );
}
