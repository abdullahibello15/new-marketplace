/**
 * Nigerian banks customers can pay from by USSD, with each bank's USSD short code.
 * Shared by any feature that needs a bank list. Order: most-used first, so phones with small screens
 * show the likely choice without scrolling.
 */
export interface NigerianBank {
  id: string;
  name: string;
  /** The bank's USSD short code, e.g. "*737" for GTBank. */
  ussdPrefix: string;
}

export const NIGERIAN_BANKS: readonly NigerianBank[] = [
{ id: 'gtbank', name: 'GTBank', ussdPrefix: '*737' },
{ id: 'access', name: 'Access Bank', ussdPrefix: '*901' },
{ id: 'firstbank', name: 'First Bank', ussdPrefix: '*894' },
{ id: 'uba', name: 'UBA', ussdPrefix: '*919' },
{ id: 'zenith', name: 'Zenith Bank', ussdPrefix: '*966' },
{ id: 'fidelity', name: 'Fidelity Bank', ussdPrefix: '*770' },
{ id: 'union', name: 'Union Bank', ussdPrefix: '*826' },
{ id: 'sterling', name: 'Sterling Bank', ussdPrefix: '*822' },
{ id: 'wema', name: 'Wema Bank', ussdPrefix: '*945' },
{ id: 'fcmb', name: 'FCMB', ussdPrefix: '*329' },
{ id: 'ecobank', name: 'Ecobank', ussdPrefix: '*326' },
{ id: 'stanbic', name: 'Stanbic IBTC', ussdPrefix: '*909' },
{ id: 'polaris', name: 'Polaris Bank', ussdPrefix: '*833' },
{ id: 'keystone', name: 'Keystone Bank', ussdPrefix: '*7111' },
{ id: 'unity', name: 'Unity Bank', ussdPrefix: '*7799' }];


export const findBank = (id: string) => NIGERIAN_BANKS.find((b) => b.id === id);
