// ------------------------------------------------------------------------------
// GENERATED FILE - source: subscriberstatuses/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import type { ListSubscriberStatusFilter } from "./ListSubscriberStatusFilter.generated";
import type { ListSubscriberStatusSort } from "./ListSubscriberStatusSort.generated";

export interface ListSubscriberStatusRequest {
  "filters": ListSubscriberStatusFilter[];
  "page": number;
  "pageSize": number;
  "sort": ListSubscriberStatusSort[];
}
export const ListSubscriberStatusRequestTypeKey = "Demo.TelegramOperations.Api.Contracts.ListSubscriberStatusRequest" as const;
