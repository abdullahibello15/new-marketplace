import { addHours } from 'date-fns';
import { mockJobs } from '../../jobs/mock/jobs';
import { mockOrders } from '../../orders/mock/orders';
import { ADMIN_POLICIES } from '../config/policies';
import type { DisputeCase, DisputeEvidence, InternalNote, MediationMessage, PartyMessage } from '../types';

/*
 * MOCK mediation cases for every disputed job and order in the mock data: the customer's claim, the
 * vendor's side where they've answered, the mediator's messages and notes, and the earlier in-app chat
 * between them. Times are relative to when the problem was reported, so deadlines stay realistic.
 */

const plusHours = (iso: string, h: number) => addHours(new Date(iso), h).toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

interface Override {
  vendorResponse?: {afterHours: number;text: string;attachments?: string[];};
  /** Taken on by a mediator this many hours ago. */
  assignee?: {adminId: string;adminName: string;hoursAgo: number;};
  /** The mediator asked the customer for evidence this many hours ago (sets the customer's deadline). */
  customerEvidenceRequest?: {hoursAgo: number;message: string;respondedHoursAgo?: number;response?: string;};
  messages?: {hoursAgo: number;to: 'customer' | 'vendor' | 'both';body: string;}[];
  notes?: {hoursAgo: number;author: string;body: string;}[];
}

const AMINA = { adminId: 'adm-amina', adminName: 'Amina Sule' };

const OVERRIDES: Record<string, Override> = {
  'job:2330': { vendorResponse: { afterHours: 6, text: 'The roof valve wasn’t in my quote. I offered to fit it for ₦3,000 extra and she refused.' } },
  'job:2331': {
    assignee: { ...AMINA, hoursAgo: 30 },
    vendorResponse: { afterHours: 10, text: 'I used the measurements I took on the day. I can let out the seams on both outfits for free before Saturday.' },
    customerEvidenceRequest: { hoursAgo: 26, message: 'Please send photos of both outfits being worn, and the note of your measurements if you have it.' },
    messages: [{ hoursAgo: 25, to: 'vendor', body: 'Thanks Hauwa. Can you confirm in writing that the alterations are free and done by Friday?' }],
    notes: [{ hoursAgo: 24, author: 'Amina Sule', body: 'Vendor seems willing to fix. If the customer accepts the free alteration, close with Dismiss once she confirms.' }]
  },
  'job:2333': { vendorResponse: { afterHours: 5, text: 'The leak test was clean when I left. If it’s warm again the compressor may be failing, which is a different repair.' } },
  'job:2335': {
    assignee: { ...AMINA, hoursAgo: 60 },
    vendorResponse: { afterHours: 12, text: 'She asked for them tight so they last longer. Loosening after a week is normal with knotless braids.' },
    customerEvidenceRequest: { hoursAgo: 50, message: 'Please send clear photos of the braids at the roots and of your scalp where it is sore.' },
    messages: [{ hoursAgo: 49, to: 'both', body: 'I’m looking into this now. I’ve asked for photos so I can see the braids. Please keep messages here so everything is on record.' }]
  },
  'job:2338': {
    assignee: { ...AMINA, hoursAgo: 40 },
    vendorResponse: { afterHours: 8, text: 'We hit an unmarked pipe. I have already offered to pay a plumber and repaint the wall.', attachments: ['/8cea2981-0ed5-4d4d-aa23-828c0576dded.jpg'] },
    customerEvidenceRequest: {
      hoursAgo: 36,
      message: 'Could you send a quote for the plumbing and repainting, so we can see what it costs?',
      respondedHoursAgo: 20,
      response: 'The plumber quoted ₦6,500 and the painter ₦4,000.'
    },
    notes: [{ hoursAgo: 19, author: 'Amina Sule', body: 'Repair costs ₦10,500 total. A partial refund of that amount seems fair: the AC itself works.' }]
  },
  'job:2340': { assignee: { ...AMINA, hoursAgo: 260 }, vendorResponse: { afterHours: 4, text: 'The report was sent on WhatsApp the same day. Copy attached.' } },
  'job:2341': { assignee: { ...AMINA, hoursAgo: 290 }, vendorResponse: { afterHours: 6, text: 'The embroidery thread ran out. I can refund that part.' } },
  'job:2342': { assignee: { adminId: 'adm-ngozi', adminName: 'Ngozi Eze', hoursAgo: 320 }, vendorResponse: { afterHours: 3, text: 'Yes, my apprentice cut it wrongly. I agree to refund her.' } },
  'order:5020': { vendorResponse: { afterHours: 4, text: 'The bags were sealed when they left my shop. I can swap them if she brings them back.' } },
  'order:5024': { assignee: { ...AMINA, hoursAgo: 230 }, vendorResponse: { afterHours: 5, text: 'One piece was from a different batch. Happy to refund half of it.' } }
};

const chatFor = (openedAt: string, title: string, details: string): PartyMessage[] => [
{ id: 'pm-1', from: 'customer', body: `Hello, just confirming the ${title.toLowerCase()} is still on as agreed.`, at: plusHours(openedAt, -50) },
{ id: 'pm-2', from: 'vendor', body: 'Yes, all set. See you then.', at: plusHours(openedAt, -49) },
{ id: 'pm-3', from: 'customer', body: `There’s a problem: ${details.split('. ')[0]}.`, at: plusHours(openedAt, -1) },
{ id: 'pm-4', from: 'vendor', body: 'Let me check and get back to you.', at: plusHours(openedAt, -0.5) }];


function buildCase(kind: 'job' | 'order', id: string, openedAt: string, details: string, photos: string[], title: string): DisputeCase {
  const o = OVERRIDES[`${kind}:${id}`] ?? {};
  const evidence: DisputeEvidence[] = [{ id: 'ev-1', party: 'customer', kind: 'claim', text: details, attachments: photos, at: openedAt }];
  if (o.vendorResponse) {
    evidence.push({ id: 'ev-2', party: 'vendor', kind: 'response', text: o.vendorResponse.text, attachments: o.vendorResponse.attachments ?? [], at: plusHours(openedAt, o.vendorResponse.afterHours) });
  }
  const messages: MediationMessage[] = [];
  const request = o.customerEvidenceRequest;
  if (request) {
    messages.push({ id: 'msg-req', from: 'mediator', to: 'customer', authorName: o.assignee?.adminName ?? 'Gwani', body: request.message, at: hoursAgo(request.hoursAgo), kind: 'evidence_request' });
    if (request.response && request.respondedHoursAgo !== undefined) {
      evidence.push({ id: 'ev-3', party: 'customer', kind: 'response', text: request.response, attachments: [], at: hoursAgo(request.respondedHoursAgo) });
      messages.push({ id: 'msg-reply', from: 'customer', to: 'mediator', authorName: 'Customer', body: request.response, at: hoursAgo(request.respondedHoursAgo), kind: 'message' });
    }
  }
  (o.messages ?? []).forEach((m, i) => messages.push({ id: `msg-${i + 1}`, from: 'mediator', to: m.to, authorName: o.assignee?.adminName ?? 'Gwani', body: m.body, at: hoursAgo(m.hoursAgo), kind: 'message' }));
  const notes: InternalNote[] = (o.notes ?? []).map((n, i) => ({ id: `note-${i + 1}`, authorName: n.author, body: n.body, at: hoursAgo(n.hoursAgo) }));
  const assignedAt = o.assignee ? hoursAgo(o.assignee.hoursAgo) : null;

  return {
    id: `dsp-${kind}-${id}`,
    subject: { kind, id },
    // A mediator keeps a dispute they've taken on (no time limit, unlike verification claims).
    assignee: o.assignee && assignedAt ? { adminId: o.assignee.adminId, adminName: o.assignee.adminName, at: assignedAt, expiresAt: plusHours(assignedAt, 24 * 365) } : null,
    deadlines: {
      vendor: { requestedAt: openedAt, dueAt: plusHours(openedAt, ADMIN_POLICIES.disputeResponseHours), respondedAt: o.vendorResponse ? plusHours(openedAt, o.vendorResponse.afterHours) : null },
      customer: request ?
      {
        requestedAt: hoursAgo(request.hoursAgo),
        dueAt: plusHours(hoursAgo(request.hoursAgo), ADMIN_POLICIES.disputeResponseHours),
        respondedAt: request.respondedHoursAgo !== undefined ? hoursAgo(request.respondedHoursAgo) : null
      } :
      null
    },
    evidence: evidence.sort((a, b) => a.at.localeCompare(b.at)),
    messages: messages.sort((a, b) => a.at.localeCompare(b.at)),
    partyMessages: chatFor(openedAt, title, details),
    notes
  };
}

export const mockDisputeCases: DisputeCase[] = [
...mockJobs.flatMap((j) => j.dispute ? [buildCase('job', j.id, j.dispute.at, j.dispute.details, j.photos, j.serviceName ?? 'job')] : []),
...mockOrders.flatMap((o) => o.dispute ? [buildCase('order', o.id, o.dispute.at, o.dispute.details, o.items.map((i) => i.image).filter((x): x is string => !!x).slice(0, 1), 'order')] : [])];
