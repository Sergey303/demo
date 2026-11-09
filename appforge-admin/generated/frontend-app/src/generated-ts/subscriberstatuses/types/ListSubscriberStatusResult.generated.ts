// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscriberstatuses/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import type { SubscriberStatusDto } from "./SubscriberStatusDto.generated";

export interface ListSubscriberStatusResult {
  "items": SubscriberStatusDto[];
  "page": number;
  "pageSize": number;
  "totalCount": number;
}
export const ListSubscriberStatusResultTypeKey = "Demo.TelegramOperations.Api.Contracts.ListSubscriberStatusResult" as const;
