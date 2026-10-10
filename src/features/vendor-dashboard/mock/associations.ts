import { addMonths, startOfDay } from 'date-fns';
import { ASSOCIATION_MEMBER_STATUS } from '../constants';
import { daysFromNow } from './time';
import type { Association } from '../types';

/** The association the demo admin screen manages. */
export const DEMO_ASSOCIATION_ID = 'assoc-minna-artisans';

const renewsOn = daysFromNow(12, 23, 59);
const periodStart = startOfDay(addMonths(new Date(renewsOn), -1)).toISOString();

export const mockAssociations: Association[] = [
{
  id: DEMO_ASSOCIATION_ID,
  name: 'Minna Artisans Association',
  adminName: 'Alhaji Sani Lapai',
  periodStart,
  renewsOn,
  members: [
  { id: 'm1', vendorId: 'yusuf-borehole', vendorName: 'Yusuf Plumbing & Borehole', contact: '0805 220 1188', status: ASSOCIATION_MEMBER_STATUS.Active, addedAt: daysFromNow(-90, 10), coveredFrom: daysFromNow(-90, 10), removedAt: null, accessUntil: null },
  { id: 'm2', vendorId: 'musa-auto-clinic', vendorName: 'Musa Auto Clinic', contact: 'musa@autoclinic.ng', status: ASSOCIATION_MEMBER_STATUS.Active, addedAt: daysFromNow(-90, 10), coveredFrom: daysFromNow(-90, 10), removedAt: null, accessUntil: null },
  { id: 'm3', vendorId: 'emeka-paints', vendorName: 'Emeka Paints & Finishes', contact: '0809 441 7720', status: ASSOCIATION_MEMBER_STATUS.Active, addedAt: daysFromNow(-60, 10), coveredFrom: daysFromNow(-60, 10), removedAt: null, accessUntil: null },
  { id: 'm4', vendorId: 'grace-hair-beauty', vendorName: 'Grace Hair & Beauty', contact: 'grace@gracehair.ng', status: ASSOCIATION_MEMBER_STATUS.Active, addedAt: daysFromNow(-30, 10), coveredFrom: daysFromNow(-30, 10), removedAt: null, accessUntil: null },
  // Removed mid-period: keeps access until the paid period ends; not in the next bundle.
  { id: 'm5', vendorId: 'danladi-carpentry', vendorName: 'Danladi Carpentry & Furniture', contact: '0703 662 9015', status: ASSOCIATION_MEMBER_STATUS.Removed, addedAt: daysFromNow(-90, 10), coveredFrom: daysFromNow(-90, 10), removedAt: daysFromNow(-5, 15), accessUntil: renewsOn }]

}];


/**
 * MOCK vendor contact directory, for "add member by phone or email". A real backend would look the
 * vendor up by their verified account phone or email.
 */
export const mockVendorContacts: {vendorId: string;vendorName: string;phone: string;email: string;}[] = [
{ vendorId: 'bala-plumbing', vendorName: 'Bala Plumbing Services', phone: '+2348031112233', email: 'bala@balaplumbing.ng' },
{ vendorId: 'yusuf-borehole', vendorName: 'Yusuf Plumbing & Borehole', phone: '+2348052201188', email: 'yusuf@borehole.ng' },
{ vendorId: 'musa-auto-clinic', vendorName: 'Musa Auto Clinic', phone: '+2348067714400', email: 'musa@autoclinic.ng' },
{ vendorId: 'emeka-paints', vendorName: 'Emeka Paints & Finishes', phone: '+2348094417720', email: 'emeka@paints.ng' },
{ vendorId: 'grace-hair-beauty', vendorName: 'Grace Hair & Beauty', phone: '+2348125509981', email: 'grace@gracehair.ng' },
{ vendorId: 'danladi-carpentry', vendorName: 'Danladi Carpentry & Furniture', phone: '+2347036629015', email: 'danladi@woodworks.ng' },
{ vendorId: 'ibrahim-electrical', vendorName: 'Ibrahim Electrical Works', phone: '+2348023345566', email: 'ibrahim@electrical.ng' },
{ vendorId: 'hauwa-tailoring', vendorName: 'Hauwa Tailoring & Ankara', phone: '+2349016627788', email: 'hauwa@ankara.ng' }];
