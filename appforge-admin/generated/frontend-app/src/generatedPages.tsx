import { lazy, type ReactNode } from "react";
const CampaignsPage = lazy(() => import("./generated-ts/campaigns/pages/CampaignsPage.generated").then((module) => ({ default: module.CampaignsPage })));
const CampaignstatusesPage = lazy(() => import("./generated-ts/campaignstatuses/pages/CampaignstatusesPage.generated").then((module) => ({ default: module.CampaignstatusesPage })));
const LeadsPage = lazy(() => import("./generated-ts/leads/pages/LeadsPage.generated").then((module) => ({ default: module.LeadsPage })));
const LeadstatusesPage = lazy(() => import("./generated-ts/leadstatuses/pages/LeadstatusesPage.generated").then((module) => ({ default: module.LeadstatusesPage })));
const PermissionsPage = lazy(() => import("./generated-ts/permissions/pages/PermissionsPage.generated").then((module) => ({ default: module.PermissionsPage })));
const RolepermissionsPage = lazy(() => import("./generated-ts/rolepermissions/pages/RolepermissionsPage.generated").then((module) => ({ default: module.RolepermissionsPage })));
const RolesPage = lazy(() => import("./generated-ts/roles/pages/RolesPage.generated").then((module) => ({ default: module.RolesPage })));
const SubscribersPage = lazy(() => import("./generated-ts/subscribers/pages/SubscribersPage.generated").then((module) => ({ default: module.SubscribersPage })));
const SubscriberstatusesPage = lazy(() => import("./generated-ts/subscriberstatuses/pages/SubscriberstatusesPage.generated").then((module) => ({ default: module.SubscriberstatusesPage })));

export interface GeneratedPage {
  route: string;
  title: string;
  element: ReactNode;
}

export const generatedPages: GeneratedPage[] = [
  { route: "/campaigns", title: "Campaigns", element: <CampaignsPage /> },
  { route: "/campaignstatuses", title: "Campaignstatuses", element: <CampaignstatusesPage /> },
  { route: "/leads", title: "Leads", element: <LeadsPage /> },
  { route: "/leadstatuses", title: "Leadstatuses", element: <LeadstatusesPage /> },
  { route: "/permissions", title: "Permissions", element: <PermissionsPage /> },
  { route: "/rolepermissions", title: "Rolepermissions", element: <RolepermissionsPage /> },
  { route: "/roles", title: "Roles", element: <RolesPage /> },
  { route: "/subscribers", title: "Subscribers", element: <SubscribersPage /> },
  { route: "/subscriberstatuses", title: "Subscriberstatuses", element: <SubscriberstatusesPage /> },
];
