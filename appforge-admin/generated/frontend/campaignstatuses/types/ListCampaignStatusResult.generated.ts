// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaignstatuses/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import type { CampaignStatusDto } from "./CampaignStatusDto.generated";

export interface ListCampaignStatusResult {
  "items": CampaignStatusDto[];
  "page": number;
  "pageSize": number;
  "totalCount": number;
}
export const ListCampaignStatusResultTypeKey = "Demo.TelegramOperations.Api.Contracts.ListCampaignStatusResult" as const;
