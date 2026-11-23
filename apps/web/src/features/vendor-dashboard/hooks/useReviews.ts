import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../../hooks/useToast";
import i18n from "../../../i18n";
import { errorMessage, genericError } from "../../../lib/errors";
import { useCurrentVendor } from "../../auth/hooks/useCurrentVendor";
import { ApiError } from "../../../services/mockApi";
import {
  listReviews,
  replyToReview,
  reportReview,
} from "../services/reviewService";
import {
  getMyVendorReviews,
  replyToMyVendorReview,
} from "../services/vendorReviewApi";
import { computeReviewStats } from "../utils/reviews";
import type {
  RatingFilter,
  ReportReviewInput,
  Review,
  ReviewStats,
} from "../types";

const EMPTY: Review[] = [];

export function useReviews() {
  const { live } = useCurrentVendor();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    status: "loading" | "success" | "error";
    reviews: Review[] | null;
    stats: ReviewStats | null;
    error: unknown;
  }>({ status: "loading", reviews: null, stats: null, error: null });
  const toast = useToast();
  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, status: "loading", error: null }));
    const load = live
      ? getMyVendorReviews().then((response) => ({
          reviews: response.reviews,
          stats: response.summary,
        }))
      : listReviews().then((reviews) => ({
          reviews,
          stats: computeReviewStats(reviews),
        }));
    load.then(
      (data) => {
        if (!cancelled) setState({ status: "success", ...data, error: null });
      },
      (error: unknown) => {
        if (!cancelled)
          setState({ status: "error", reviews: null, stats: null, error });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt, live]);
  const reload = useCallback(() => setAttempt((current) => current + 1), []);
  const reviews = state.reviews ?? EMPTY;
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<Review | null>(null);

  const stats = state.stats ?? computeReviewStats(reviews);

  const visible = useMemo(
    () =>
      reviews
        .filter((r) => ratingFilter === "all" || r.rating === ratingFilter)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reviews, ratingFilter],
  );

  const replace = (updated: Review) =>
    setState((current) => ({
      ...current,
      reviews: (current.reviews ?? []).map((r) =>
        r.id === updated.id ? updated : r,
      ),
    }));

  /** Resolves true on success so the form knows whether to close. */
  async function reply(id: string, body: string): Promise<boolean> {
    try {
      replace(
        live
          ? await replyToMyVendorReview(id, body)
          : await replyToReview(id, body),
      );
      setReplyingId(null);
      toast.success(i18n.t("vendor:reviews.toastReplied"));
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  }

  async function report(input: ReportReviewInput): Promise<boolean> {
    if (!reportTarget || live) return false;
    try {
      replace(await reportReview(reportTarget.id, input));
      setReportTarget(null);
      toast.success(i18n.t("vendor:reviews.toastReported"));
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  }

  return {
    reviews,
    visible,
    stats,
    live,
    status: state.status,
    error: state.error instanceof Error ? state.error.message : genericError(),
    isRealFailure:
      state.status === "error" &&
      (!(state.error instanceof ApiError) || state.error.status >= 500),
    reload,
    ratingFilter,
    setRatingFilter,
    replyingId,
    startReply: setReplyingId,
    cancelReply: () => setReplyingId(null),
    reply,
    reportTarget,
    openReport: setReportTarget,
    closeReport: () => setReportTarget(null),
    report,
  };
}
