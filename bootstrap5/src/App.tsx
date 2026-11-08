import { Navigate, Route, Routes } from "react-router-dom";
import { WorkContextProvider } from "./context/WorkContextProvider";
import { ProfileProvider } from "./context/ProfileProvider";
import { WorkContextSelector } from "./context/WorkContextSelector";
import { DashboardBreadcrumbs } from "./navigation/DashboardBreadcrumbs";
import { DashboardNavigation } from "./navigation/DashboardNavigation";
import { DashboardHomePage } from "./pages/DashboardHomePage";
import { HiringDemoPage } from "./pages/HiringDemoPage";
import { EnterpriseAiPage } from "./pages/EnterpriseAiPage";
import { OverviewPage } from "./pages/OverviewPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ProfessionalProfilePage } from "./pages/ProfessionalProfilePage";
import { SettingsPage } from "./pages/SettingsPage";
import { WorkContextsPage } from "./pages/WorkContextsPage";
import { dashboardRoutes } from "./routes";
import { DashboardShell } from "./shell/DashboardShell";

const pagesByPath = {
  "/dashboard": <DashboardHomePage />,
  "/dashboard/hiring-demo": <HiringDemoPage />,
  "/dashboard/enterprise-ai": <EnterpriseAiPage />,
  "/dashboard/overview": <OverviewPage />,
  "/dashboard/profile": <ProfilePage />,
  "/dashboard/profile/professional": <ProfessionalProfilePage />,
  "/dashboard/work-contexts": <WorkContextsPage />,
  "/dashboard/settings": <SettingsPage />,
};

export function App() {
  return (
    <WorkContextProvider>
      <ProfileProvider>
        <DashboardShell
          navigation={<DashboardNavigation />}
          breadcrumbs={<DashboardBreadcrumbs />}
          workContext={<WorkContextSelector />}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            {dashboardRoutes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={pagesByPath[route.path as keyof typeof pagesByPath]}
              />
            ))}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </DashboardShell>
      </ProfileProvider>
    </WorkContextProvider>
  );
}
