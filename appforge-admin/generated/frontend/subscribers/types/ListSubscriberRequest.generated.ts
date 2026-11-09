// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscribers/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import type { ListSubscriberFilter } from "./ListSubscriberFilter.generated";
import type { ListSubscriberSort } from "./ListSubscriberSort.generated";

export interface ListSubscriberRequest {
  "filters": ListSubscriberFilter[];
  "page": number;
  "pageSize": number;
  "sort": ListSubscriberSort[];
}
export const ListSubscriberRequestTypeKey = "Demo.TelegramOperations.Api.Contracts.ListSubscriberRequest" as const;
