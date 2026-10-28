import { addMinutes, format } from 'date-fns';
import { VERIFICATION } from '../../../data/verificationTiers';
import { ADMIN_POLICIES } from '../config/policies';
import { DOCUMENT_PLACEHOLDERS, DOCUMENT_TYPE, VERIFICATION_STATUS } from '../constants';
import type { DocumentChecks, DocumentType, VerificationApplication, VerificationDocument } from '../types';

/*
 * MOCK verification applications from the directory vendors: pending, in review (claimed), more info
 * needed, and past approvals and rejections. Document images are specimen artwork in public/admin-docs,
 * not real documents. ID numbers are fake. Times are relative to now.
 */

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const DAY = 24;
const dateIn = (days: number) => format(new Date(Date.now() + days * 86_400_000), 'yyyy-MM-dd');

const { NationalId, DriversLicence, VotersCard, BusinessRegistration, ProofOfAddress, TradeCertificate } = DOCUMENT_TYPE;
const { Unverified, Id, Trade } = VERIFICATION;

let docCount = 0;
function doc(type: DocumentType, nameOnDocument: string, uploadedHoursAgo: number, extra: Partial<Pick<VerificationDocument, 'idNumber' | 'expiresOn' | 'fileUrl'>> = {}): VerificationDocument {
  docCount += 1;
  return {
    id: `doc-${docCount}`,
    type,
    fileUrl: extra.fileUrl ?? DOCUMENT_PLACEHOLDERS[type],
    nameOnDocument,
    idNumber: extra.idNumber ?? null,
    expiresOn: extra.expiresOn ?? null,
    uploadedAt: hoursAgo(uploadedHoursAgo)
  };
}

function claim(adminId: string, adminName: string, minutesAgo: number) {
  const at = new Date(Date.now() - minutesAgo * 60_000);
  return { adminId, adminName, at: at.toISOString(), expiresAt: addMinutes(at, ADMIN_POLICIES.claimMinutes).toISOString() };
}

type Seed = Omit<VerificationApplication, 'checks' | 'notes' | 'claim' | 'decision' | 'resubmittedAt'> &
Partial<Pick<VerificationApplication, 'notes' | 'claim' | 'decision' | 'resubmittedAt'>> & {
  /** Checks already made, in document order (null = not checked yet). */
  checks?: (DocumentChecks | null)[];
};

const ALL_OK: DocumentChecks = { legible: true, notExpired: true, nameMatches: true };

function app({ checks = [], ...s }: Seed): VerificationApplication {
  const byId = Object.fromEntries(s.documents.flatMap((d, i) => checks[i] ? [[d.id, checks[i]]] : []));
  return { notes: '', claim: null, decision: null, resubmittedAt: null, ...s, checks: byId };
}

export const mockApplications: VerificationApplication[] = [
/* ---------- Pending ---------- */
app({
  id: 'ver-1001', vendorId: 'kontagora-fresh-mart', vendorName: 'Kontagora Fresh Mart', applicantName: 'Aliyu Garba',
  currentTier: Unverified, requestedTier: Id, submittedAt: hoursAgo(5 * DAY), status: VERIFICATION_STATUS.Pending,
  documents: [
  doc(VotersCard, 'Aliyu Garba', 5 * DAY, { idNumber: '90F5B3D248291004' }),
  doc(BusinessRegistration, 'Kontagora Fresh Mart (BN 3302114)', 5 * DAY)]

}),
app({
  id: 'ver-1002', vendorId: 'kure-market-grocery', vendorName: 'Kure Market Provisions', applicantName: 'Rahila Joseph',
  currentTier: Unverified, requestedTier: Id, submittedAt: hoursAgo(3 * DAY + 4), status: VERIFICATION_STATUS.Pending,
  documents: [
  doc(NationalId, 'Rahila Joseph', 3 * DAY, { idNumber: '23781049552' }),
  doc(BusinessRegistration, 'Kure Market Provisions (BN 2917740)', 3 * DAY)]

}),
app({
  id: 'ver-1003', vendorId: 'emeka-paints', vendorName: 'Emeka Paints & Finishes', applicantName: 'Emeka Nwosu',
  currentTier: Unverified, requestedTier: Id, submittedAt: hoursAgo(2 * DAY), status: VERIFICATION_STATUS.Pending,
  documents: [
  doc(NationalId, 'Emeka C. Nwosu', 2 * DAY, { idNumber: '31120876543' }),
  doc(ProofOfAddress, 'Emeka Nwosu', 2 * DAY)]

}),
app({
  id: 'ver-1004', vendorId: 'swift-wheels', vendorName: 'Swift Wheels Logistics', applicantName: 'Sani Bello',
  currentTier: Unverified, requestedTier: Id, submittedAt: hoursAgo(26), status: VERIFICATION_STATUS.Pending,
  documents: [
  doc(DriversLicence, 'Sani Bello', 26, { idNumber: 'NIG-KTG44871AB62', expiresOn: dateIn(400) }),
  doc(ProofOfAddress, 'Sani Bello', 26)],

  resubmittedAt: hoursAgo(26)
}),
app({
  id: 'ver-1005', vendorId: 'hauwa-tailoring', vendorName: 'Hauwa Tailoring & Ankara', applicantName: 'Hauwa Garba',
  currentTier: Id, requestedTier: Trade, submittedAt: hoursAgo(4 * DAY), status: VERIFICATION_STATUS.Pending,
  documents: [
  doc(TradeCertificate, 'Hauwa Garba (Fashion design, NABTEB)', 4 * DAY, { expiresOn: null }),
  doc(BusinessRegistration, 'Hauwa Tailoring & Ankara (BN 1188502)', 4 * DAY)]

}),
app({
  id: 'ver-1006', vendorId: 'abdullahi-mechanic', vendorName: 'Abdullahi Mechanic Works', applicantName: 'Abdullahi Umar',
  currentTier: Id, requestedTier: Trade, submittedAt: hoursAgo(6), status: VERIFICATION_STATUS.Pending,
  documents: [doc(TradeCertificate, 'Abdullahi Umar (Motor vehicle mechanics, NABTEB)', 6, { expiresOn: dateIn(900) })]
}),
app({
  id: 'ver-1007', vendorId: 'grace-hair-beauty', vendorName: 'Grace Hair & Beauty', applicantName: 'Grace Ibrahim',
  currentTier: Id, requestedTier: Trade, submittedAt: hoursAgo(9 * DAY), status: VERIFICATION_STATUS.Pending,
  documents: [
  doc(TradeCertificate, 'Grace Ibrahim (Cosmetology)', 9 * DAY),
  doc(ProofOfAddress, 'Grace Ibrahim', 40)],

  resubmittedAt: hoursAgo(40),
  decision: {
    outcome: 'more_info',
    by: 'Tunde Bako',
    at: hoursAgo(6 * DAY),
    message: 'Please upload a proof of address dated in the last 3 months. The one you sent was from last year.',
    documentsNeeded: [ProofOfAddress]
  }
}),
/* ---------- In review (claimed) ---------- */
app({
  id: 'ver-1008', vendorId: 'sadiya-stitches', vendorName: 'Sadiya Stitches', applicantName: 'Sadiya Lawal',
  currentTier: Unverified, requestedTier: Id, submittedAt: hoursAgo(2 * DAY + 8), status: VERIFICATION_STATUS.InReview,
  documents: [
  doc(NationalId, 'Sadiya Lawal', 2 * DAY, { idNumber: '44190327718' }),
  doc(ProofOfAddress, 'Sadiya Lawal', 2 * DAY)],

  claim: claim('adm-yakubu', 'Yakubu Danjuma', 10)
}),
app({
  id: 'ver-1009', vendorId: 'chidi-carpentry', vendorName: 'Chidi Woodworks', applicantName: 'Chidi Okeke',
  currentTier: Id, requestedTier: Trade, submittedAt: hoursAgo(3 * DAY), status: VERIFICATION_STATUS.InReview,
  documents: [
  doc(TradeCertificate, 'Chidiebere Okeke (Carpentry & joinery)', 3 * DAY),
  doc(BusinessRegistration, 'Chidi Woodworks (BN 2290031)', 3 * DAY)],

  claim: claim('adm-yakubu', 'Yakubu Danjuma', 22)
}),
app({
  id: 'ver-1010', vendorId: 'zainab-dispatch', vendorName: 'Zainab Swift Dispatch', applicantName: 'Zainab Abdullahi',
  currentTier: Id, requestedTier: Trade, submittedAt: hoursAgo(30), status: VERIFICATION_STATUS.InReview,
  documents: [
  doc(DriversLicence, 'Zainab Abdullahi', 30, { idNumber: 'NIG-MNA90215ZA11', expiresOn: dateIn(25) }),
  doc(TradeCertificate, 'Zainab Abdullahi (Dispatch rider safety course)', 30)],

  checks: [ALL_OK],
  notes: 'Licence expires next month. Ask for renewal at the next re-verification.',
  claim: claim('adm-tunde', 'Tunde Bako', 5)
}),
/* ---------- More info needed ---------- */
app({
  id: 'ver-1011', vendorId: 'bala-plumbing', vendorName: 'Bala Plumbing Services', applicantName: 'Bala Musa',
  currentTier: Trade, requestedTier: Trade, submittedAt: hoursAgo(4 * DAY), status: VERIFICATION_STATUS.MoreInfo,
  documents: [
  doc(NationalId, 'Bala Musa', 4 * DAY, { idNumber: '12098834561' }),
  doc(TradeCertificate, 'Bala Musa (Plumbing & pipe fitting)', 4 * DAY, { expiresOn: format(new Date(Date.now() - 20 * 86_400_000), 'yyyy-MM-dd') })],

  decision: {
    outcome: 'more_info',
    by: 'Tunde Bako',
    at: hoursAgo(2 * DAY),
    message: 'Annual re-verification: your trade certificate expired last month. Please upload the renewed certificate so you keep your Trade-Verified badge.',
    documentsNeeded: [TradeCertificate]
  }
}),
app({
  id: 'ver-1012', vendorId: 'fatima-fresh-foods', vendorName: 'Fatima Fresh Foods', applicantName: 'Fatima Bello',
  currentTier: Id, requestedTier: Trade, submittedAt: hoursAgo(8 * DAY), status: VERIFICATION_STATUS.MoreInfo,
  documents: [doc(BusinessRegistration, 'Fatima Fresh Foods (BN 3011249)', 8 * DAY)],
  decision: {
    outcome: 'more_info',
    by: 'Yakubu Danjuma',
    at: hoursAgo(6 * DAY),
    message: 'For Trade-Verified we need a food handler’s certificate (NAFDAC or the state health office). Your business registration is fine.',
    documentsNeeded: [TradeCertificate]
  }
}),
app({
  id: 'ver-1013', vendorId: 'bosso-greens', vendorName: 'Bosso Greens & Grains', applicantName: 'Musa Danladi',
  currentTier: Id, requestedTier: Trade, submittedAt: hoursAgo(7 * DAY), status: VERIFICATION_STATUS.MoreInfo,
  documents: [
  doc(TradeCertificate, 'Musa Danladi (Agro-produce handling)', 7 * DAY),
  doc(ProofOfAddress, 'M. Danladi', 7 * DAY)],

  decision: {
    outcome: 'more_info',
    by: 'Tunde Bako',
    at: hoursAgo(5 * DAY),
    message: 'The proof of address photo is cut off at the bottom, so we can’t read the date. Please upload a clear photo of the whole page.',
    documentsNeeded: [ProofOfAddress]
  }
}),
/* ---------- Approved ---------- */
app({
  id: 'ver-0990', vendorId: 'musa-auto-clinic', vendorName: 'Musa Auto Clinic', applicantName: 'Musa Ibrahim',
  currentTier: Id, requestedTier: Trade, submittedAt: hoursAgo(22 * DAY), status: VERIFICATION_STATUS.Approved,
  documents: [doc(TradeCertificate, 'Musa Ibrahim (Auto electrical & AC)', 22 * DAY)],
  checks: [ALL_OK],
  decision: { outcome: 'approved', by: 'Tunde Bako', at: hoursAgo(20 * DAY), message: null, documentsNeeded: [] }
}),
app({
  id: 'ver-0985', vendorId: 'paiko-cool-electrical', vendorName: 'Paiko Cool Electrical', applicantName: 'Ishaku Paiko',
  currentTier: Id, requestedTier: Trade, submittedAt: hoursAgo(33 * DAY), status: VERIFICATION_STATUS.Approved,
  documents: [doc(TradeCertificate, 'Ishaku Paiko (Electrical installation, COREN)', 33 * DAY)],
  checks: [ALL_OK],
  decision: { outcome: 'approved', by: 'Yakubu Danjuma', at: hoursAgo(30 * DAY), message: null, documentsNeeded: [] }
}),
app({
  id: 'ver-0970', vendorId: 'yusuf-borehole', vendorName: 'Yusuf Plumbing & Borehole', applicantName: 'Yusuf Abdullahi',
  currentTier: Id, requestedTier: Trade, submittedAt: hoursAgo(47 * DAY), status: VERIFICATION_STATUS.Approved,
  documents: [doc(TradeCertificate, 'Yusuf Abdullahi (Water well drilling)', 47 * DAY)],
  checks: [ALL_OK],
  decision: { outcome: 'approved', by: 'Tunde Bako', at: hoursAgo(45 * DAY), message: null, documentsNeeded: [] }
}),
/* ---------- Rejected (both vendors have applied again above) ---------- */
app({
  id: 'ver-0995', vendorId: 'emeka-paints', vendorName: 'Emeka Paints & Finishes', applicantName: 'Emeka Nwosu',
  currentTier: Unverified, requestedTier: Trade, submittedAt: hoursAgo(17 * DAY), status: VERIFICATION_STATUS.Rejected,
  documents: [doc(ProofOfAddress, 'Emeka Nwosu', 17 * DAY)],
  checks: [ALL_OK],
  decision: { outcome: 'rejected', by: 'Yakubu Danjuma', at: hoursAgo(15 * DAY), message: 'No evidence of trade skills for this tier', documentsNeeded: [] }
}),
app({
  id: 'ver-0992', vendorId: 'swift-wheels', vendorName: 'Swift Wheels Logistics', applicantName: 'Sani Bello',
  currentTier: Unverified, requestedTier: Id, submittedAt: hoursAgo(14 * DAY), status: VERIFICATION_STATUS.Rejected,
  documents: [doc(DriversLicence, 'Sani Bello', 14 * DAY, { idNumber: 'NIG-KTG44871AB62', expiresOn: format(new Date(Date.now() - 60 * 86_400_000), 'yyyy-MM-dd') })],
  checks: [{ legible: true, notExpired: false, nameMatches: true }],
  decision: { outcome: 'rejected', by: 'Tunde Bako', at: hoursAgo(12 * DAY), message: 'A document has expired', documentsNeeded: [] }
})];
