import { useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import { Link, useLocation } from "react-router-dom";
import { Badge } from "primereact/badge";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { OverlayPanel } from "primereact/overlaypanel";
import type { OverlayPanel as OverlayPanelRef } from "primereact/overlaypanel";
import { useDemoStore } from "./context";
import { primeThemeOptions } from "./primeThemes";
import { selectAttentionAppointments } from "./selectors";

export function DemoLayout({ children }: PropsWithChildren) {
  const { state, dispatch } = useDemoStore();
  const location = useLocation();
  const clinic = state.clinics.find((item) => item.id === state.selectedClinicId);
  const clinicOptions = useMemo(
    () => state.clinics.map((item) => ({ label: item.name, value: item.id })),
    [state.clinics]
  );
  const [clinicDialogOpen, setClinicDialogOpen] = useState(false);
  const [clinicId, setClinicId] = useState(state.selectedClinicId);
  const userMenuRef = useRef<OverlayPanelRef>(null);
  const openCount = selectAttentionAppointments(state).length;
  const openDialog = () => {
    setClinicId(state.selectedClinicId);
    setClinicDialogOpen(true);
  };
  const saveClinic = () => {
    dispatch({ type: "select_context", clinicId, role: state.selectedRole });
    setClinicDialogOpen(false);
  };
  return (
    <div className="demo-app">
      <header className="app-header">
        <div role="note" style={{ padding: "8px 12px", background: "#fff6df", color: "#4c390d", fontSize: "0.875rem" }}>Демонстрационный прототип · вымышленные данные · ВетИС имитируется · не вводите реальные персональные данные.</div>
        <div className="header-row">
          <div>
            <strong>Клиника:</strong> {clinic?.name}
            <Button icon="pi pi-pencil" text className="clinic-trigger" onClick={openDialog} />
          </div>
          <Button
            icon="pi pi-user"
            rounded
            text
            aria-label="Меню пользователя"
            onClick={(event) => userMenuRef.current?.toggle(event)}
          />
          <OverlayPanel ref={userMenuRef}>
            <div className="stack">
              <strong>Пользователь</strong>
              <label className="field">
                <span>Тема интерфейса</span>
                <Dropdown
                  value={state.selectedTheme}
                  options={primeThemeOptions}
                  onChange={(event) => dispatch({ type: "select_theme", theme: event.value })}
                />
              </label>
            </div>
          </OverlayPanel>
        </div>
        <nav className="app-nav">
          <Link className={location.pathname === "/appointments/today" ? "active" : ""} to="/appointments/today">Мои приёмы</Link>
          <Link className={location.pathname === "/search" ? "active" : ""} to="/search">Поиск</Link>
          <Link className={location.pathname === "/attention" ? "active" : ""} to="/attention">Требуют внимания <Badge value={openCount} /></Link>
          <Link className={location.pathname === "/demo-settings" ? "active" : ""} to="/demo-settings">Настройки демо</Link>
        </nav>
      </header>
      <Dialog
        header="Выбор клиники"
        visible={clinicDialogOpen}
        onHide={() => setClinicDialogOpen(false)}
        style={{ width: "min(540px, calc(100vw - 24px))" }}
      >
        <div className="stack">
          <label className="field">
            <span>Клиника</span>
            <Dropdown value={clinicId} options={clinicOptions} onChange={(event) => setClinicId(event.value)} />
          </label>
          <div className="actions-row">
            <Button label="Отмена" outlined onClick={() => setClinicDialogOpen(false)} />
            <Button label="Сохранить" onClick={saveClinic} />
          </div>
        </div>
      </Dialog>
      <main className="demo-page">{children}</main>
    </div>
  );
}
