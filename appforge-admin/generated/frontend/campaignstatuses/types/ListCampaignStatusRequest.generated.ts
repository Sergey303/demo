// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaignstatuses/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import type { ListCampaignStatusFilter } from "./ListCampaignStatusFilter.generated";
import type { ListCampaignStatusSort } from "./ListCampaignStatusSort.generated";

export interface ListCampaignStatusRequest {
  "filters": ListCampaignStatusFilter[];
  "page": number;
  "pageSize": number;
  "sort": ListCampaignStatusSort[];
}
export const ListCampaignStatusRequestTypeKey = "Demo.TelegramOperations.Api.Contracts.ListCampaignStatusRequest" as const;
