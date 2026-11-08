export type DashboardRoute = {
  path: string;
  label: string;
  description: string;
  parentPath?: string;
  navVisible?: boolean;
};

// A single registry drives routing and navigation.
export const dashboardRoutes: readonly DashboardRoute[] = [
  { path: "/dashboard", label: "Главная", description: "Обзор рабочего пространства" },
  { path: "/dashboard/hiring-demo", label: "Живое демо .NET", description: "Outbox, идемпотентность и восстановление", parentPath: "/dashboard" },
  {
    path: "/dashboard/overview",
    label: "Обзор",
    description: "Краткая информация по активности",
    parentPath: "/dashboard",
  },
  {
    path: "/dashboard/profile",
    label: "Профиль",
    description: "Общие сведения о пользователе",
    parentPath: "/dashboard",
  },
  {
    path: "/dashboard/profile/professional",
    label: "Профессиональный профиль",
    description: "Профессиональные сведения и форма",
    parentPath: "/dashboard/profile",
  },
  {
    path: "/dashboard/work-contexts",
    label: "Рабочие контексты",
    description: "Переключение рабочего контекста",
    parentPath: "/dashboard",
  },
  {
    path: "/dashboard/settings",
    label: "Настройки",
    description: "Настройки интерфейса",
    parentPath: "/dashboard",
  },
];
