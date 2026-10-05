import React, { lazy } from 'react';
import { Navigate, Route, RouterProvider, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';
import { ToastProvider } from './components/ui/ToastProvider';
import { RequestsProvider } from './features/vendor-dashboard/context/RequestsProvider';
import { JobsProvider } from './contexts/JobsContext';
import { VendorsProvider } from './contexts/VendorsContext';
import { VendorPortalProvider } from './contexts/VendorPortalContext';
import { CustomerShell } from './components/CustomerShell';
import { VendorShell } from './components/VendorShell';
import { PlaceProvider } from './features/discovery/context/PlaceProvider';
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
const EditProfileSection = lazy(() =>
import('./features/vendor-profile/sections/EditProfileSection').then((m) => ({ default: m.EditProfileSection }))
);

// A data router (rather than <BrowserRouter>) so pages can block navigation, e.g. to warn about unsaved changes.
const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route
        element={
        <PlaceProvider>
            <CustomerShell />
          </PlaceProvider>
        }>

        <Route path="/" element={<HomeSection />} />
        <Route path="/search" element={<SearchResultsSection />} />
        <Route path="/vendors/:vendorId" element={<VendorProfileSection />} />
        <Route path="/vendor/:vendorId" element={<LegacyVendorRedirect />} />
        <Route path="/vendors/:vendorId/book" element={<JobRequestSection />} />
        <Route path="/vendor/:vendorId/request" element={<LegacyJobRequestRedirect />} />
        <Route path="/jobs" element={<MyJobsSection />} />
        <Route path="/jobs/:jobId" element={<JobDetailsSection />} />
        <Route path="/bookings" element={<Navigate to="/jobs" replace />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route
        path="/pro"
        element={
        <RequestsProvider>
            <VendorShell />
          </RequestsProvider>
        }>

        <Route index element={<RequestsSection />} />
        <Route path="requests/:requestId" element={<RequestDetailSection />} />
        <Route path="calendar" element={<CalendarSection />} />
        <Route path="catalogue" element={<Catalogue />} />
        <Route path="catalogue/products" element={<Products />} />
        <Route path="catalogue/products/new" element={<ProductEditor />} />
        <Route path="catalogue/products/import" element={<ProductImport />} />
        <Route path="catalogue/products/:productId" element={<ProductEditor />} />
        <Route path="earnings" element={<EarningsSection />} />
        <Route path="reviews" element={<ReviewsSection />} />
        <Route path="subscription" element={<SubscriptionSection />} />
        <Route path="profile" element={<EditProfileSection />} />
      </Route>
    </>
  )
);

export function App() {
  return (
    <JobsProvider>
      <VendorsProvider>
        <VendorPortalProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </VendorPortalProvider>
      </VendorsProvider>
    </JobsProvider>);

}
