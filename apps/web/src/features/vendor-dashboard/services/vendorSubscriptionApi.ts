import { apiRequest } from "../../../services/apiClient";

export interface VendorSubscriptionResponse {
  current: { plan: string; status: string; renewsAt: string | null };
  plans: Array<{
    id: string;
    name: string;
    priceKobo: number;
    includes: string[];
  }>;
}

export function getMyVendorSubscription() {
  return apiRequest<VendorSubscriptionResponse>("/v1/vendors/me/subscription");
}
