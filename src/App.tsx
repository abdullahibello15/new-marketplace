import { Suspense, lazy } from 'react';
import { Navigate, Route, RouterProvider, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';
import { ToastProvider } from './components/ui/ToastProvider';
import { EnglishOnly } from './i18n/EnglishOnly';
import { RequestsProvider } from './features/vendor-dashboard/context/RequestsProvider';
import { JobsProvider } from './contexts/JobsContext';
import { VendorsProvider } from './contexts/VendorsContext';
import { VendorPortalProvider } from './contexts/VendorPortalContext';
import { CustomerShell } from './components/CustomerShell';
import { VendorShell } from './components/VendorShell';
import { InvestorShell } from './components/InvestorShell';
import { RiderShell } from './components/RiderShell';
import { AuthProvider } from './features/auth/context/AuthContext';
import { SessionGuard } from './features/auth/components/SessionGuard';
import { AuthLayout } from './features/auth/components/AuthLayout';
import { DevAuthBanner } from './features/auth/components/DevAuthBanner';
import { LoginGate, RequireAuth, RequireRole, RequireVendorProfile } from './features/auth/components/guards';
import { AUTH_ROUTES, ROLE } from './features/auth/constants';
import { AboutPage, LandingGate } from './features/landing/components/LandingGate';
import { LanguageSync } from './i18n/LanguageSync';
import { PlaceProvider } from './features/discovery/context/PlaceProvider';
import { CartProvider } from './features/orders/context/CartProvider';
import { VendorOrdersProvider } from './features/orders/context/VendorOrdersProvider';
import { LegacyVendorRedirect } from './features/public-profile/sections/LegacyVendorRedirect';
import { LegacyJobRequestRedirect } from './features/jobs/sections/LegacyJobRequestRedirect';
import { Inbox } from './pages/Inbox';
import { Profile } from './pages/Profile';
import { NotFound } from './pages/NotFound';
import { Catalogue } from './pages/vendor/Catalogue';
import { Products } from './pages/vendor/Products';
import { ProductEditor } from './pages/vendor/ProductEditor';
import { ProductImport } from './pages/vendor/ProductImport';

// Customer discovery pages and vendor dashboard sections load on demand; the shell shows a placeholder meanwhile.
const HomeSection = lazy(() => import('./features/discovery/sections/HomeSection').then((m) => ({ default: m.HomeSection })));
const VendorProfileSection = lazy(() =>
import('./features/public-profile/sections/VendorProfileSection').then((m) => ({ default: m.VendorProfileSection }))
);
const JobRequestSection = lazy(() => import('./features/jobs/sections/JobRequestSection').then((m) => ({ default: m.JobRequestSection })));
const MyJobsSection = lazy(() => import('./features/jobs/sections/MyJobsSection').then((m) => ({ default: m.MyJobsSection })));
const JobDetailsSection = lazy(() => import('./features/jobs/sections/JobDetailsSection').then((m) => ({ default: m.JobDetailsSection })));
const ProductsSection = lazy(() => import('./features/discovery/sections/ProductsSection').then((m) => ({ default: m.ProductsSection })));
const ProductDetailSection = lazy(() =>
import('./features/discovery/sections/ProductDetailSection').then((m) => ({ default: m.ProductDetailSection }))
);
const SearchResultsSection = lazy(() =>
import('./features/discovery/sections/SearchResultsSection').then((m) => ({ default: m.SearchResultsSection }))
);
const RequestsSection = lazy(() => import('./features/vendor-dashboard/sections/RequestsSection').then((m) => ({ default: m.RequestsSection })));
const RequestDetailSection = lazy(() =>
import('./features/vendor-dashboard/sections/RequestDetailSection').then((m) => ({ default: m.RequestDetailSection }))
);
const CalendarSection = lazy(() => import('./features/vendor-dashboard/sections/CalendarSection').then((m) => ({ default: m.CalendarSection })));
const EarningsSection = lazy(() => import('./features/vendor-dashboard/sections/EarningsSection').then((m) => ({ default: m.EarningsSection })));
const ReviewsSection = lazy(() => import('./features/vendor-dashboard/sections/ReviewsSection').then((m) => ({ default: m.ReviewsSection })));
const SubscriptionSection = lazy(() =>
import('./features/vendor-dashboard/sections/SubscriptionSection').then((m) => ({ default: m.SubscriptionSection }))
);
const CartSection = lazy(() => import('./features/orders/sections/CartSection').then((m) => ({ default: m.CartSection })));
const CheckoutSection = lazy(() => import('./features/orders/sections/CheckoutSection').then((m) => ({ default: m.CheckoutSection })));
const MyOrdersSection = lazy(() => import('./features/orders/sections/MyOrdersSection').then((m) => ({ default: m.MyOrdersSection })));
const OrderDetailsSection = lazy(() => import('./features/orders/sections/OrderDetailsSection').then((m) => ({ default: m.OrderDetailsSection })));
const VendorOrdersSection = lazy(() => import('./features/orders/sections/VendorOrdersSection').then((m) => ({ default: m.VendorOrdersSection })));
const VendorOrderDetailSection = lazy(() =>
import('./features/orders/sections/VendorOrderDetailSection').then((m) => ({ default: m.VendorOrderDetailSection }))
);
const PaymentCheckoutSection = lazy(() =>
import('./features/payments/sections/PaymentCheckoutSection').then((m) => ({ default: m.PaymentCheckoutSection }))
);
const ReceiptSection = lazy(() => import('./features/payments/sections/ReceiptSection').then((m) => ({ default: m.ReceiptSection })));
const TransactionsSection = lazy(() => import('./features/payments/sections/TransactionsSection').then((m) => ({ default: m.TransactionsSection })));
const TransactionDetailSection = lazy(() =>
import('./features/payments/sections/TransactionDetailSection').then((m) => ({ default: m.TransactionDetailSection }))
);
const NotificationPreferencesSection = lazy(() =>
import('./features/reminders/sections/NotificationPreferencesSection').then((m) => ({ default: m.NotificationPreferencesSection }))
);
// Dev builds only: Vite replaces import.meta.env.DEV with false in production, so this chunk isn't built.
const ReminderDevSection = import.meta.env.DEV ?
lazy(() => import('./features/reminders/sections/ReminderDevSection').then((m) => ({ default: m.ReminderDevSection }))) :
null;
const BillingHistorySection = lazy(() =>
import('./features/vendor-dashboard/sections/BillingHistorySection').then((m) => ({ default: m.BillingHistorySection }))
);
const InvoiceReceiptSection = lazy(() =>
import('./features/vendor-dashboard/sections/InvoiceReceiptSection').then((m) => ({ default: m.InvoiceReceiptSection }))
);
const AssociationSection = lazy(() =>
import('./features/vendor-dashboard/sections/AssociationSection').then((m) => ({ default: m.AssociationSection }))
);
const InvestorOverviewSection = lazy(() =>
import('./features/investor/sections/InvestorOverviewSection').then((m) => ({ default: m.InvestorOverviewSection }))
);
const InvestorLedgerSection = lazy(() => import('./features/investor/sections/InvestorLedgerSection').then((m) => ({ default: m.InvestorLedgerSection })));
const InvestorPayoutsSection = lazy(() => import('./features/investor/sections/InvestorPayoutsSection').then((m) => ({ default: m.InvestorPayoutsSection })));
const VerificationStandingSection = lazy(() =>
import('./features/vendor-dashboard/sections/VerificationStandingSection').then((m) => ({ default: m.VerificationStandingSection }))
);
// The admin console loads only when /admin is opened, so none of it is in the customer or vendor bundles.
const AdminLayout = lazy(() => import('./features/admin/components/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminHomeRedirect = lazy(() => import('./features/admin/components/AdminLayout').then((m) => ({ default: m.AdminHomeRedirect })));
const RequireSection = lazy(() => import('./features/admin/components/AdminLayout').then((m) => ({ default: m.RequireSection })));
const VerificationQueueSection = lazy(() =>
import('./features/admin/sections/VerificationQueueSection').then((m) => ({ default: m.VerificationQueueSection }))
);
const VerificationReviewSection = lazy(() =>
import('./features/admin/sections/VerificationReviewSection').then((m) => ({ default: m.VerificationReviewSection }))
);
const DisputesSection = lazy(() => import('./features/admin/sections/DisputesSection').then((m) => ({ default: m.DisputesSection })));
const DisputeDetailSection = lazy(() => import('./features/admin/sections/DisputeDetailSection').then((m) => ({ default: m.DisputeDetailSection })));
const ModerationSection = lazy(() => import('./features/admin/sections/ModerationSection').then((m) => ({ default: m.ModerationSection })));
const AnalyticsSection = lazy(() => import('./features/admin/sections/AnalyticsSection').then((m) => ({ default: m.AnalyticsSection })));
const OutreachSection = lazy(() => import('./features/admin/sections/OutreachSection').then((m) => ({ default: m.OutreachSection })));
const BulkToolsSection = lazy(() => import('./features/admin/sections/BulkToolsSection').then((m) => ({ default: m.BulkToolsSection })));
const VendorImportSection = lazy(() => import('./features/admin/sections/VendorImportSection').then((m) => ({ default: m.VendorImportSection })));
const VendorImportDetailSection = lazy(() =>
import('./features/admin/sections/VendorImportDetailSection').then((m) => ({ default: m.VendorImportDetailSection }))
);
const ClaimProfileSection = lazy(() => import('./features/profile-claim/sections/ClaimProfileSection').then((m) => ({ default: m.ClaimProfileSection })));
const NotAuthorised = lazy(() => import('./features/admin/components/NotAuthorised').then((m) => ({ default: m.NotAuthorised })));
const LoginSection = lazy(() => import('./features/auth/sections/LoginSection').then((m) => ({ default: m.LoginSection })));
const SignupSection = lazy(() => import('./features/auth/sections/SignupSection').then((m) => ({ default: m.SignupSection })));
const WelcomeSection = lazy(() => import('./features/auth/sections/WelcomeSection').then((m) => ({ default: m.WelcomeSection })));
const PasswordResetSection = lazy(() => import('./features/auth/sections/PasswordResetSection').then((m) => ({ default: m.PasswordResetSection })));
const AddRoleSection = lazy(() => import('./features/auth/sections/AddRoleSection').then((m) => ({ default: m.AddRoleSection })));
const AdminLoginSection = lazy(() => import('./features/admin/sections/AdminLoginSection').then((m) => ({ default: m.AdminLoginSection })));
const VerifyEmailSection = lazy(() => import('./features/auth/sections/VerifyEmailSection').then((m) => ({ default: m.VerifyEmailSection })));
const VerifyPhoneSection = lazy(() => import('./features/auth/sections/VerifyPhoneSection').then((m) => ({ default: m.VerifyPhoneSection })));
const VendorSetupSection = lazy(() => import('./features/auth/sections/VendorSetupSection').then((m) => ({ default: m.VendorSetupSection })));
const ActiveSessionsSection = lazy(() => import('./features/auth/sections/ActiveSessionsSection').then((m) => ({ default: m.ActiveSessionsSection })));
const ProviderTermsSection = lazy(() => import('./features/auth/sections/ProviderTermsSection').then((m) => ({ default: m.ProviderTermsSection })));
const RiderDashboardSection = lazy(() => import('./features/rider/sections/RiderDashboardSection').then((m) => ({ default: m.RiderDashboardSection })));
const AuditLogSection = lazy(() => import('./features/admin/sections/AuditLogSection').then((m) => ({ default: m.AuditLogSection })));
const AdminsSection = lazy(() => import('./features/admin/sections/AdminsSection').then((m) => ({ default: m.AdminsSection })));
const AdminDetailSection = lazy(() => import('./features/admin/sections/AdminDetailSection').then((m) => ({ default: m.AdminDetailSection })));
const EditProfileSection = lazy(() =>
import('./features/vendor-profile/sections/EditProfileSection').then((m) => ({ default: m.EditProfileSection }))
);

// A data router (rather than <BrowserRouter>) so pages can block navigation, e.g. to warn about unsaved changes.
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      element={
      <>
          {/* Login required for the whole app when REQUIRE_LOGIN is on (features/auth/config.ts). */}
          <LoginGate />
          <SessionGuard />
          <DevAuthBanner />
        </>
      }>

      {/* Sign-in, signup and onboarding: their own simple layout. */}
      <Route element={<AuthLayout />}>
        {/* The old Welcome screen: the landing page at "/" replaced it. */}
        <Route path="/start" element={<Navigate to={AUTH_ROUTES.start} replace />} />
        <Route path="/login" element={<LoginSection />} />
        <Route path="/login/forgot" element={<PasswordResetSection />} />
        {/* One signup path per role: the role picker, then /signup/customer, /signup/provider or /signup/rider. */}
        <Route path="/signup" element={<SignupSection />} />
        <Route path="/signup/:role" element={<SignupSection />} />
        <Route element={<RequireAuth />}>
          <Route path="/welcome" element={<WelcomeSection />} />
          <Route path="/account/roles" element={<AddRoleSection />} />
          <Route path="/account/sessions" element={<ActiveSessionsSection />} />
          <Route path="/account/verify-email" element={<VerifyEmailSection />} />
          <Route path="/account/verify-phone" element={<VerifyPhoneSection />} />
          <Route path="/account/vendor-setup" element={<VendorSetupSection />} />
        </Route>
      </Route>
      {/* The public landing page about Gwani, with its own header and footer. */}
      <Route path={AUTH_ROUTES.about} element={<AboutPage />} />
      {/*
        Customer shell. "/" is the marketplace home for guests and customers (the LandingGate sends other
        roles to their own home). Guests can browse, search, view shops and products, and fill the cart;
        checkout, payments, bookings and the account need sign-in (RequireAuth sends them to login and back).
       */}
      <Route
        element={
        <LandingGate>
            <PlaceProvider>
              <CartProvider>
                <CustomerShell />
              </CartProvider>
            </PlaceProvider>
          </LandingGate>
        }>

        <Route path="/" element={<HomeSection />} />
        <Route path="/search" element={<SearchResultsSection />} />
        <Route path="/products" element={<ProductsSection />} />
        <Route path="/products/:vendorId/:productId" element={<ProductDetailSection />} />
        <Route path="/vendors/:vendorId" element={<VendorProfileSection />} />
        <Route path="/vendor/:vendorId" element={<LegacyVendorRedirect />} />
        <Route path="/cart" element={<CartSection />} />
        <Route path="/terms/providers" element={<ProviderTermsSection />} />
        <Route element={<RequireAuth />}>
          <Route path="/vendors/:vendorId/book" element={<JobRequestSection />} />
          <Route path="/vendor/:vendorId/request" element={<LegacyJobRequestRedirect />} />
          <Route path="/jobs" element={<MyJobsSection />} />
          <Route path="/jobs/:jobId" element={<JobDetailsSection />} />
          <Route path="/bookings" element={<Navigate to="/jobs" replace />} />
          <Route path="/checkout" element={<CheckoutSection />} />
          <Route path="/orders" element={<MyOrdersSection />} />
          <Route path="/orders/:orderId" element={<OrderDetailsSection />} />
          <Route path="/pay/:kind/:id" element={<PaymentCheckoutSection />} />
          <Route path="/payments" element={<TransactionsSection />} />
          <Route path="/payments/:reference" element={<TransactionDetailSection />} />
          <Route path="/payments/:reference/receipt" element={<ReceiptSection />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/notifications" element={<NotificationPreferencesSection party="customer" />} />
        </Route>
        {/* A vendor added by their trade association claims the draft profile created for them. */}
        <Route path="/claim/:token" element={<ClaimProfileSection />} />
        {ReminderDevSection && <Route path="/dev/reminders" element={<ReminderDevSection />} />}
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route
        path="/pro"
        element={
        <RequireRole role={ROLE.Provider}>
            <RequireVendorProfile>
              <RequestsProvider>
                <VendorOrdersProvider>
                  <VendorShell />
                </VendorOrdersProvider>
              </RequestsProvider>
            </RequireVendorProfile>
          </RequireRole>
        }>

        <Route index element={<RequestsSection />} />
        <Route path="requests/:requestId" element={<RequestDetailSection />} />
        <Route path="orders" element={<VendorOrdersSection />} />
        <Route path="orders/:orderId" element={<VendorOrderDetailSection />} />
        <Route path="calendar" element={<CalendarSection />} />
        <Route path="catalogue" element={<Catalogue />} />
        <Route path="catalogue/products" element={<Products />} />
        <Route path="catalogue/products/new" element={<ProductEditor />} />
        <Route path="catalogue/products/import" element={<ProductImport />} />
        <Route path="catalogue/products/:productId" element={<ProductEditor />} />
        <Route path="earnings" element={<EarningsSection />} />
        <Route path="reviews" element={<ReviewsSection />} />
        <Route path="subscription" element={<SubscriptionSection />} />
        <Route path="subscription/billing" element={<BillingHistorySection />} />
        <Route path="subscription/billing/:invoiceId" element={<InvoiceReceiptSection />} />
        <Route path="association" element={<AssociationSection />} />
        {/* The shared payment screen, inside the vendor portal (subscription invoices). */}
        <Route path="pay/:kind/:id" element={<PaymentCheckoutSection />} />
        {/* The vendor's copy of a customer's receipt, with the commission breakdown. */}
        <Route path="payments/:reference/receipt" element={<ReceiptSection viewer="vendor" />} />
        <Route path="profile" element={<EditProfileSection />} />
        <Route path="notifications" element={<NotificationPreferencesSection party="vendor" />} />
        <Route path="verification" element={<VerificationStandingSection />} />
      </Route>
      {/* Staff sign-in (phone + one-time code): its own plain page, linked only from the landing footer. */}
      <Route
        path="/admin/login"
        element={
        <Suspense fallback={<div className="min-h-screen bg-sand" aria-busy="true" />}>
            <AdminLoginSection />
          </Suspense>
        } />

      {/* Gwani's admin console: its own layout. Signed-out visitors go to the staff login; signed-in non-staff see "Not authorised"; each admin role sees only its sections. */}
      <Route
        path="/admin"
        element={
        <EnglishOnly>
            <Suspense fallback={<div className="min-h-screen bg-cream" aria-busy="true" />}>
              <RequireRole role={ROLE.Admin} fallback={<NotAuthorised />} loginTo={AUTH_ROUTES.staffLogin}>
                <AdminLayout />
              </RequireRole>
            </Suspense>
          </EnglishOnly>
        }>

        <Route index element={<AdminHomeRedirect />} />
        <Route path="verification" element={<RequireSection section="verification"><VerificationQueueSection /></RequireSection>} />
        <Route path="verification/:id" element={<RequireSection section="verification"><VerificationReviewSection /></RequireSection>} />
        <Route path="disputes" element={<RequireSection section="disputes"><DisputesSection /></RequireSection>} />
        <Route path="disputes/:id" element={<RequireSection section="disputes"><DisputeDetailSection /></RequireSection>} />
        <Route path="moderation" element={<RequireSection section="moderation"><ModerationSection /></RequireSection>} />
        <Route path="analytics" element={<RequireSection section="analytics"><AnalyticsSection /></RequireSection>} />
        <Route path="outreach" element={<RequireSection section="outreach"><OutreachSection /></RequireSection>} />
        <Route path="bulk" element={<RequireSection section="bulk"><BulkToolsSection /></RequireSection>} />
        <Route path="bulk/vendor-import" element={<RequireSection section="bulk"><VendorImportSection /></RequireSection>} />
        <Route path="bulk/imports/:importId" element={<RequireSection section="bulk"><VendorImportDetailSection /></RequireSection>} />
        <Route path="audit" element={<RequireSection section="audit"><AuditLogSection /></RequireSection>} />
        {/* Super admin only (admins.manage in the role config); everyone else gets "Not authorised". UI only: the backend enforces it. */}
        <Route path="admins" element={<RequireSection section="admins" permission="admins.manage" fallback={<NotAuthorised inline message="Only a Super admin can manage admins." />}><AdminsSection /></RequireSection>} />
        <Route path="admins/:id" element={<RequireSection section="admins" permission="admins.manage" fallback={<NotAuthorised inline message="Only a Super admin can manage admins." />}><AdminDetailSection /></RequireSection>} />
        <Route path="*" element={<AdminHomeRedirect />} />
      </Route>
      {/* Riders: the role, routes and shell only; delivery features come later. */}
      <Route
        path="/rider"
        element={
        <RequireRole role={ROLE.Rider}>
            <RiderShell />
          </RequireRole>
        }>

        <Route index element={<RiderDashboardSection />} />
      </Route>
      {/* The Investor role: a read-only dividend ledger (front end and mock data only). */}
      <Route path="/investor" element={<RequireAuth><EnglishOnly><InvestorShell /></EnglishOnly></RequireAuth>}>
        <Route index element={<InvestorOverviewSection />} />
        <Route path="ledger" element={<InvestorLedgerSection />} />
        <Route path="payouts" element={<InvestorPayoutsSection />} />
      </Route>
    </Route>
  )
);

export function App() {
  return (
    <AuthProvider>
    <LanguageSync />
    <JobsProvider>
      <VendorsProvider>
        <VendorPortalProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </VendorPortalProvider>
      </VendorsProvider>
    </JobsProvider>
    </AuthProvider>);

}
