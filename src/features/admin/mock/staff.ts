import { ADMIN_ROLE } from '../config/roles';
import type { AdminUser } from '../types';

/** MOCK Gwani staff directory: one person per role, plus a second verifier who holds claims in the demo. */
export const mockStaff: AdminUser[] = [
{ id: 'adm-ngozi', name: 'Ngozi Eze', role: ADMIN_ROLE.SuperAdmin },
{ id: 'adm-tunde', name: 'Tunde Bako', role: ADMIN_ROLE.Verifier },
{ id: 'adm-yakubu', name: 'Yakubu Danjuma', role: ADMIN_ROLE.Verifier },
{ id: 'adm-amina', name: 'Amina Sule', role: ADMIN_ROLE.Mediator },
{ id: 'adm-ifeoma', name: 'Ifeoma Obi', role: ADMIN_ROLE.Moderator },
{ id: 'adm-kabir', name: 'Kabir Lawal', role: ADMIN_ROLE.Analyst }];


export const staffById = (id: string) => mockStaff.find((s) => s.id === id);
