import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { PropsWithChildren } from "react";
import { clearState, loadState, saveState } from "./storage";
import type { AppAction, AppState } from "./state";
import { initialState, reducer } from "./state";

type Store = {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  reset: () => void;
};

const StoreContext = createContext<Store | null>(null);

const mergeById = <T extends { id: string }>(saved: T[] | undefined, seed: T[]) => {
  const rows = saved ?? seed;
  const ids = new Set(rows.map((item) => item.id));
  return [...rows, ...seed.filter((item) => !ids.has(item.id))];
};

const hydrateState = (restored: Partial<AppState> | null): AppState => {
  if (!restored) return initialState;
  const startedAtById = new Map(initialState.appointments.map((item) => [item.id, item.startedAt]));
  const appointments = mergeById(restored.appointments, initialState.appointments).map((item) => ({
    ...item,
    startedAt: item.startedAt || startedAtById.get(item.id) || ""
  }));
  return {
    ...initialState,
    ...restored,
    clinics: mergeById(restored.clinics, initialState.clinics),
    owners: mergeById(restored.owners, initialState.owners),
    animals: mergeById(restored.animals, initialState.animals),
    appointments,
    actions: mergeById(restored.actions, initialState.actions),
    submissions: mergeById(restored.submissions, initialState.submissions),
    notifications: restored.notifications ?? initialState.notifications,
    dictionaries: mergeById(restored.dictionaries, initialState.dictionaries),
    audit: restored.audit ?? initialState.audit
  };
};

export function DemoStoreProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(reducer, hydrateState(loadState()));
  useEffect(() => saveState(state), [state]);
  const value = useMemo(
    () => ({
      state,
      dispatch,
      reset: () => {
        clearState();
        dispatch({ type: "reset" });
      }
    }),
    [state]
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useDemoStore(): Store {
  const value = useContext(StoreContext);
  if (!value) throw new Error("DemoStoreProvider missing");
  return value;
}
