# Telegram Operations Admin

This deliberately bounded demonstration specifies administrative data management for a
Telegram-oriented product. It does not specify a Telegram bot, a payment processor, or
a broadcast delivery engine. All data is synthetic and may be entered manually.

## Entity Subscriber

Table: Subscribers
Namespace: Demo.TelegramOperations

| Property | Type | Required | Key | MaxLength | Values |
|---|---|---:|---:|---:|---|
| Id | Guid | true | true | | |
| Handle | string | true | false | 80 | |
| DisplayName | string | true | false | 200 | |
| Status | Lookup | true | false | | active=Active; paused=Paused; blocked=Blocked |
| JoinedAt | DateTime | true | false | | |
| Note | string | false | false | 500 | |

| Name | Properties | Unique |
|---|---|---:|
| IX_Subscribers_Handle | Handle | true |
| IX_Subscribers_Status | Status | false |

## AccessPolicy:Subscriber

| Action | SubjectKind | Subjects | Scope | OwnerField |
|---|---|---|---|---|
| Read | Role | Admin | All | |
| Create | Role | Admin | All | |
| Update | Role | Admin | All | |
| Delete | Role | Admin | All | |

## Entity Lead

Table: Leads
Namespace: Demo.TelegramOperations

| Property | Type | Required | Key | MaxLength | Values |
|---|---|---:|---:|---:|---|
| Id | Guid | true | true | | |
| SubscriberId | Guid | true | false | | |
| Subject | string | true | false | 200 | |
| Status | Lookup | true | false | | new=New; contacted=Contacted; qualified=Qualified; closed=Closed |
| Owner | string | false | false | 120 | |
| CreatedAt | DateTime | true | false | | |
| Note | string | false | false | 1000 | |

| Navigation | Target | ForeignKey | Required | Inverse |
|---|---|---|---:|---|
| Subscriber | Subscriber | SubscriberId | true | Leads |

| Name | Properties | Unique |
|---|---|---:|
| IX_Leads_SubscriberId | SubscriberId | false |
| IX_Leads_Status | Status | false |

## AccessPolicy:Lead

| Action | SubjectKind | Subjects | Scope | OwnerField |
|---|---|---|---|---|
| Read | Role | Admin | All | |
| Create | Role | Admin | All | |
| Update | Role | Admin | All | |
| Delete | Role | Admin | All | |

## Entity Campaign

Table: Campaigns
Namespace: Demo.TelegramOperations

| Property | Type | Required | Key | MaxLength | Values |
|---|---|---:|---:|---:|---|
| Id | Guid | true | true | | |
| Name | string | true | false | 160 | |
| AudienceDescription | string | true | false | 300 | |
| MessageTemplate | string | true | false | 2000 | |
| Status | Lookup | true | false | | draft=Draft; approved=Approved; archived=Archived |
| CreatedAt | DateTime | true | false | | |
| Note | string | false | false | 500 | |

| Name | Properties | Unique |
|---|---|---:|
| IX_Campaigns_Name | Name | false |
| IX_Campaigns_Status | Status | false |

## AccessPolicy:Campaign

| Action | SubjectKind | Subjects | Scope | OwnerField |
|---|---|---|---|---|
| Read | Role | Admin | All | |
| Create | Role | Admin | All | |
| Update | Role | Admin | All | |
| Delete | Role | Admin | All | |
