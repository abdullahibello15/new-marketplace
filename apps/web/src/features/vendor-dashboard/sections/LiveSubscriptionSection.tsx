import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../../../components/PageHeader";
import { Button } from "../../../components/ui/Button";
import { ErrorState } from "../../../components/ui/ErrorState";
import { LoadingState } from "../../../components/ui/LoadingState";
import { PageContainer } from "../../../components/ui/PageContainer";
import { genericError } from "../../../lib/errors";
import { ApiError } from "../../../services/mockApi";
import { getMyVendorSubscription } from "../services/vendorSubscriptionApi";

const money = (kobo: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(kobo / 100);

export function LiveSubscriptionSection() {
  const { t } = useTranslation("vendor");
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    status: "loading" | "success" | "error";
    data: Awaited<ReturnType<typeof getMyVendorSubscription>> | null;
    error: unknown;
  }>({ status: "loading", data: null, error: null });
  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, status: "loading", error: null }));
    getMyVendorSubscription().then(
      (data) => {
        if (!cancelled) setState({ status: "success", data, error: null });
      },
      (error: unknown) => {
        if (!cancelled) setState({ status: "error", data: null, error });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  const reload = useCallback(() => setAttempt((current) => current + 1), []);
  const isRealFailure =
    state.status === "error" &&
    (!(state.error instanceof ApiError) || state.error.status >= 500);

  return (
    <>
      <PageHeader
        title={t("subscription.title")}
        subtitle={t("subscription.subtitle")}
      />
      <PageContainer>
        {isRealFailure ? (
          <ErrorState message={genericError()} onRetry={reload} />
        ) : null}
        {state.status === "error" && !isRealFailure ? (
          <p
            role="alert"
            className="rounded-xl border border-line bg-white p-4 text-sm text-muted"
          >
            {genericError()}
          </p>
        ) : null}
        {!state.data && state.status !== "error" ? (
          <LoadingState
            label={t("subscription.loading")}
            rows={2}
            rowClassName="h-48"
          />
        ) : null}
        {state.data ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-muted">
                    {t("subscription.card.current")}
                  </p>
                  <h2 className="mt-1 text-2xl font-extrabold text-ink">
                    {state.data.current.plan === "free"
                      ? t("subscription.notOnPaidPlan")
                      : (state.data.plans.find(
                          (plan) => plan.id === state.data?.current.plan,
                        )?.name ?? state.data.current.plan)}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {state.data.current.status}
                  </p>
                  {state.data.current.renewsAt && (
                    <p className="mt-2 text-sm text-muted">
                      {t("subscription.card.renewsOn")}:{" "}
                      {new Intl.DateTimeFormat("en-NG", {
                        dateStyle: "medium",
                      }).format(new Date(state.data.current.renewsAt))}
                    </p>
                  )}
                </div>
              </div>
            </section>
            <section className="grid gap-4 md:grid-cols-3">
              {state.data.plans
                .filter((plan) => plan.id !== "free")
                .map((plan) => {
                  const isCurrentPlan = plan.id === state.data?.current.plan;
                  return (
                    <article
                      key={plan.id}
                      className={`rounded-2xl border bg-white p-5 ${
                        isCurrentPlan
                          ? "border-pine ring-1 ring-pine/30"
                          : "border-line"
                      }`}
                    >
                      <h3 className="font-bold text-ink">{plan.name}</h3>
                      <p className="mt-2 text-xl font-extrabold text-ink">
                        {money(plan.priceKobo)}
                      </p>
                      <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted">
                        {plan.includes.map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>
                      {isCurrentPlan ? (
                        <p className="mt-5 rounded-xl bg-pine/10 px-4 py-3 text-center text-sm font-bold text-pine">
                          {t("subscription.currentPlan")}
                        </p>
                      ) : (
                        <div className="mt-5 space-y-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            fullWidth
                            disabled
                            title={t("subscription.comingSoon")}
                          >
                            {t("subscription.choosePlan")}
                          </Button>
                          <p className="text-center text-xs text-muted">
                            {t("subscription.comingSoon")}
                          </p>
                        </div>
                      )}
                    </article>
                  );
                })}
            </section>
          </div>
        ) : null}
      </PageContainer>
    </>
  );
}
