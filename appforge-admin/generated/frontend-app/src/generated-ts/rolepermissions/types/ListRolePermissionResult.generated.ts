// ------------------------------------------------------------------------------
// GENERATED FILE - source: rolepermissions/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import type { RolePermissionDto } from "./RolePermissionDto.generated";

export interface ListRolePermissionResult {
  "items": RolePermissionDto[];
  "page": number;
  "pageSize": number;
  "totalCount": number;
}
export const ListRolePermissionResultTypeKey = "Demo.BusinessOperations.Api.Contracts.ListRolePermissionResult" as const;
