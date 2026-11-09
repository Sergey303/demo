import { lazy, type ReactNode } from "react";
const CustomersPage = lazy(() => import("./generated-ts/customers/pages/CustomersPage.generated").then((module) => ({ default: module.CustomersPage })));
const PermissionsPage = lazy(() => import("./generated-ts/permissions/pages/PermissionsPage.generated").then((module) => ({ default: module.PermissionsPage })));
const RolepermissionsPage = lazy(() => import("./generated-ts/rolepermissions/pages/RolepermissionsPage.generated").then((module) => ({ default: module.RolepermissionsPage })));
const RolesPage = lazy(() => import("./generated-ts/roles/pages/RolesPage.generated").then((module) => ({ default: module.RolesPage })));
const ServicerequestsPage = lazy(() => import("./generated-ts/servicerequests/pages/ServicerequestsPage.generated").then((module) => ({ default: module.ServicerequestsPage })));
const WorkitemsPage = lazy(() => import("./generated-ts/workitems/pages/WorkitemsPage.generated").then((module) => ({ default: module.WorkitemsPage })));

export interface GeneratedPage {
  route: string;
  title: string;
  element: ReactNode;
}

export const generatedPages: GeneratedPage[] = [
  { route: "/customers", title: "Customers", element: <CustomersPage /> },
  { route: "/permissions", title: "Permissions", element: <PermissionsPage /> },
  { route: "/rolepermissions", title: "Rolepermissions", element: <RolepermissionsPage /> },
  { route: "/roles", title: "Roles", element: <RolesPage /> },
  { route: "/servicerequests", title: "Servicerequests", element: <ServicerequestsPage /> },
  { route: "/workitems", title: "Workitems", element: <WorkitemsPage /> },
];
