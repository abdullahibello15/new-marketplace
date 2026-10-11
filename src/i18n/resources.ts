import enAdmin from '../locales/en/admin.json';
import enAuth from '../locales/en/auth.json';
import enCommon from '../locales/en/common.json';
import enDiscovery from '../locales/en/discovery.json';
import enJobs from '../locales/en/jobs.json';
import enLanding from '../locales/en/landing.json';
import enPayments from '../locales/en/payments.json';
import enVendor from '../locales/en/vendor.json';
import haAdmin from '../locales/ha/admin.json';
import haAuth from '../locales/ha/auth.json';
import haCommon from '../locales/ha/common.json';
import haDiscovery from '../locales/ha/discovery.json';
import haJobs from '../locales/ha/jobs.json';
import haLanding from '../locales/ha/landing.json';
import haPayments from '../locales/ha/payments.json';
import haVendor from '../locales/ha/vendor.json';

/** Every translation, by language and namespace (one JSON file per feature). */
export const resources = {
  en: { common: enCommon, auth: enAuth, discovery: enDiscovery, jobs: enJobs, vendor: enVendor, payments: enPayments, admin: enAdmin, landing: enLanding },
  ha: { common: haCommon, auth: haAuth, discovery: haDiscovery, jobs: haJobs, vendor: haVendor, payments: haPayments, admin: haAdmin, landing: haLanding }
} as const;
