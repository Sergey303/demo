// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaigns/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import type { ListCampaignFilter } from "./ListCampaignFilter.generated";
import type { ListCampaignSort } from "./ListCampaignSort.generated";

export interface ListCampaignRequest {
  "filters": ListCampaignFilter[];
  "page": number;
  "pageSize": number;
  "sort": ListCampaignSort[];
}
export const ListCampaignRequestTypeKey = "Demo.TelegramOperations.Api.Contracts.ListCampaignRequest" as const;
