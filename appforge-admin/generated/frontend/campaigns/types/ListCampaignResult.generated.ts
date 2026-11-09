// ------------------------------------------------------------------------------
// GENERATED FILE - source: campaigns/types.json
// DO NOT EDIT MANUALLY.
// ------------------------------------------------------------------------------

import type { CampaignDto } from "./CampaignDto.generated";

export interface ListCampaignResult {
  "items": CampaignDto[];
  "page": number;
  "pageSize": number;
  "totalCount": number;
}
export const ListCampaignResultTypeKey = "Demo.TelegramOperations.Api.Contracts.ListCampaignResult" as const;
