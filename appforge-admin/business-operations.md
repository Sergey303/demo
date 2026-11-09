# Business Operations Admin

A deliberately bounded, domain-neutral CRUD backoffice: customers,
service requests, and the work items used to fulfil those requests.
The primary customer CRUD deliberately avoids hard-to-edit lookup IDs,
required dates and complex validation workflows.
All sample data is synthetic. No third-party service integration is assumed.

## Entity Customer

Table: Customers
Namespace: Demo.BusinessOperations

| Property | Type | Required | Key | MaxLength |
|---|---|---:|---:|---:|
| Id | Guid | true | true | |
| Name | string | true | false | 180 |
| Email | string | false | false | 180 |
| Segment | string | false | false | 90 |
| Note | string | false | false | 500 |

| Name | Properties | Unique |
|---|---|---:|
| IX_Customers_Name | Name | false |
| IX_Customers_Email | Email | false |

## AccessPolicy:Customer

| Action | SubjectKind | Subjects | Scope | OwnerField |
|---|---|---|---|---|
| Read | Role | Admin | All | |
| Create | Role | Admin | All | |
| Update | Role | Admin | All | |
| Delete | Role | Admin | All | |

## Entity ServiceRequest

Table: ServiceRequests
Namespace: Demo.BusinessOperations

| Property | Type | Required | Key | MaxLength |
|---|---|---:|---:|---:|
| Id | Guid | true | true | |
| CustomerId | Guid | true | false | |
| Title | string | true | false | 200 |
| Priority | string | false | false | 24 |
| Description | string | false | false | 1000 |

| Navigation | Target | ForeignKey | Required | Inverse |
|---|---|---|---:|---|
| Customer | Customer | CustomerId | true | ServiceRequests |

| Name | Properties | Unique |
|---|---|---:|
| IX_ServiceRequests_CustomerId | CustomerId | false |

## AccessPolicy:ServiceRequest

| Action | SubjectKind | Subjects | Scope | OwnerField |
|---|---|---|---|---|
| Read | Role | Admin | All | |
| Create | Role | Admin | All | |
| Update | Role | Admin | All | |
| Delete | Role | Admin | All | |

## Entity WorkItem

Table: WorkItems
Namespace: Demo.BusinessOperations

| Property | Type | Required | Key | MaxLength |
|---|---|---:|---:|---|
| Id | Guid | true | true | |
| ServiceRequestId | Guid | true | false | |
| Title | string | true | false | 200 |
| Assignee | string | false | false | 120 |
| Status | string | false | false | 36 |
| Note | string | false | false | 700 |

| Navigation | Target | ForeignKey | Required | Inverse |
|---|---|---|---:|---|
| ServiceRequest | ServiceRequest | ServiceRequestId | true | WorkItems |

| Name | Properties | Unique |
|---|---|---:|
| IX_WorkItems_ServiceRequestId | ServiceRequestId | false |

## AccessPolicy:WorkItem

| Action | SubjectKind | Subjects | Scope | OwnerField |
|---|---|---|---|---|
| Read | Role | Admin | All | |
| Create | Role | Admin | All | |
| Update | Role | Admin | All | |
| Delete | Role | Admin | All | |
