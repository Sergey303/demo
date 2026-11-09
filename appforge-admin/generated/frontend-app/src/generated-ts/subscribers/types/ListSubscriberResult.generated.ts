// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscribers/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import type { SubscriberDto } from "./SubscriberDto.generated";

export interface ListSubscriberResult {
  "items": SubscriberDto[];
  "page": number;
  "pageSize": number;
  "totalCount": number;
}
export const ListSubscriberResultTypeKey = "Demo.TelegramOperations.Api.Contracts.ListSubscriberResult" as const;
