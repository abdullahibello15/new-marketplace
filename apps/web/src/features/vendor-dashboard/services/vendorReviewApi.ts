import type { Review, ReviewStats } from "../types";
import { apiRequest } from "../../../services/apiClient";

export interface VendorReviewsResponse {
  reviews: Review[];
  summary: ReviewStats;
}

export function getMyVendorReviews() {
  return apiRequest<VendorReviewsResponse>("/v1/vendors/me/reviews");
}

export function replyToMyVendorReview(reviewId: string, body: string) {
  return apiRequest<Review>(
    `/v1/vendors/me/reviews/${encodeURIComponent(reviewId)}/reply`,
    {
      method: "POST",
      body: JSON.stringify({ body }),
    },
  );
}
