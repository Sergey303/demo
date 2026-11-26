import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { useState } from "react";
import { useDemoStore } from "../app/context";
import type { Role } from "../entities/types";
import { roleDisplayName } from "../entities/status";

const roleOptions: { label: string; value: Role }[] = [
  { label: roleDisplayName.doctor, value: "doctor" },
  { label: roleDisplayName.registrar, value: "registrar" },
  { label: roleDisplayName.external_specialist, value: "external_specialist" }
];

export function DemoSettingsPage() {
  const { state, dispatch, reset } = useDemoStore();
  const [role, setRole] = useState<Role>(state.selectedRole);
  return (
    <Card title="Настройки демо" className="demo-settings-card">
      <div className="stack">
        <label className="field" htmlFor="demo-role">
          <span>Должность</span>
          <Dropdown inputId="demo-role" value={role} options={roleOptions} onChange={(event) => setRole(event.value)} />
        </label>
        <Button
          label="Сохранить должность"
          disabled={role===state.selectedRole}
          onClick={() => dispatch({ type: "select_context", clinicId: state.selectedClinicId, role })}
        />
        <div className="demo-reset-copy"><strong>Исходные данные</strong><p>Сброс возвращает исходный сценарий и очищает локальное состояние демо.</p></div>
        <Button label="Сбросить демо" severity="danger" outlined onClick={()=>{if(window.confirm("Сбросить демо? Все локальные изменения будут удалены.")){reset();setRole("doctor");}}} />
      </div>
    </Card>
  );
}
