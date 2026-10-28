import { useMemo, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { MODERATION_STATUS, MODERATION_TAB } from '../constants';
import { approveItems, decideAppeal, listModerationItems, removeItems, suspendVendor, tabOf, warnVendor } from '../services/moderationService';
import type { ModerationQueueItem, ModerationTab } from '../types';

export type ModerationView = 'pending' | 'decided';
type Busy = 'approve' | 'remove' | 'warn' | 'suspend' | 'appeal' | null;

/** Is it waiting for a decision in this tab? (Appeals wait on the appeal, not the item.) */
const isWaiting = (i: ModerationQueueItem, tab: ModerationTab) =>
tab === MODERATION_TAB.Appeals ? i.appeal?.status === 'pending' : i.status === MODERATION_STATUS.Pending;

/** The moderation queue: tabs, pending/decided, bulk selection, the focused item (keyboard), and the actions. */
export function useModerationQueue() {
  const toast = useToast();
  const queue = useAsyncData(listModerationItems);
  const [tab, setTabState] = useState<ModerationTab>(MODERATION_TAB.Photos);
  const [view, setViewState] = useState<ModerationView>('pending');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState(0);
  const [busy, setBusy] = useState<Busy>(null);

  const all = useMemo(() => queue.data ?? [], [queue.data]);
  const items = useMemo(
    () => all.filter((i) => tabOf(i) === tab || tab === MODERATION_TAB.Appeals && i.appeal).filter((i) => view === 'pending' ? isWaiting(i, tab) : !isWaiting(i, tab)),
    [all, tab, view]
  );
  const counts = useMemo(
    () => Object.fromEntries(Object.values(MODERATION_TAB).map((t) => [t, all.filter((i) => tabOf(i) === t && isWaiting(i, t)).length])) as Record<ModerationTab, number>,
    [all]
  );
  const focused = items[Math.min(focus, items.length - 1)] ?? null;
  const selectedIds = items.filter((i) => selected.has(i.id)).map((i) => i.id);

  function reset() {
    setSelected(new Set());
    setFocus(0);
  }

  async function run(kind: Busy, task: () => Promise<unknown>, success: string): Promise<boolean> {
    setBusy(kind);
    try {
      await task();
      toast.success(success);
      setSelected(new Set());
      queue.reload();
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      queue.reload();
      return false;
    } finally {
      setBusy(null);
    }
  }

  const plural = (n: number) => `${n} ${n === 1 ? 'item' : 'items'}`;

  return {
    ...queue,
    tab,
    setTab: (t: ModerationTab) => {
      setTabState(t);
      reset();
    },
    view,
    setView: (v: ModerationView) => {
      setViewState(v);
      reset();
    },
    items,
    counts,
    focused,
    focusIndex: Math.min(focus, Math.max(0, items.length - 1)),
    setFocus,
    moveFocus: (delta: number) => setFocus((f) => Math.max(0, Math.min(items.length - 1, f + delta))),
    selected,
    selectedIds,
    toggle: (id: string) => setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);else
      next.add(id);
      return next;
    }),
    selectAll: () => setSelected(new Set(items.filter((i) => isWaiting(i, tab)).map((i) => i.id))),
    clearSelection: () => setSelected(new Set()),
    busy,
    approve: (ids: string[]) => run('approve', () => approveItems(ids), `Approved ${plural(ids.length)}.`),
    remove: (ids: string[], reason: string) => run('remove', () => removeItems(ids, reason), `Removed ${plural(ids.length)}. The owners have been told why.`),
    warn: (id: string, reason: string) => run('warn', () => warnVendor(id, reason), 'Warning sent to the vendor.'),
    suspend: (id: string, reason: string) => run('suspend', () => suspendVendor(id, reason), 'Vendor suspended (soft suspension).'),
    decideAppeal: (id: string, decision: 'uphold' | 'overturn', reason: string) =>
    run('appeal', () => decideAppeal(id, decision, reason), decision === 'overturn' ? 'Appeal accepted. The content is back.' : 'Appeal declined. The removal stands.')
  };
}
