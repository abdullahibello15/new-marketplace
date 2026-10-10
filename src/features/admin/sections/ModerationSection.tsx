import { useEffect, useRef, useState } from 'react';
import { BookOpenIcon, KeyboardIcon, ShieldCheckIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { ReasonDialog } from '../../jobs/components/ReasonDialog';
import { ADMIN_PERMISSION } from '../config/roles';
import { MODERATION_REMOVE_REASONS, MODERATION_WARN_REASONS } from '../config/policies';
import { MODERATION_TAB, MODERATION_TAB_LABELS } from '../constants';
import { GuidelinesPanel } from '../components/moderation/GuidelinesPanel';
import { ModerationItemCard } from '../components/moderation/ModerationItemCard';
import { AuditTrail } from '../components/AuditTrail';
import { useAdminSession } from '../hooks/useAdminSession';
import { useModerationQueue, type ModerationView } from '../hooks/useModerationQueue';
import type { ModerationTab } from '../types';

type Action = 'remove' | 'warn' | 'suspend' | 'uphold' | 'overturn';

const SHORTCUTS: [string, string][] = [
['J / ↓', 'Next item'],
['K / ↑', 'Previous item'],
['X', 'Select or unselect'],
['A', 'Approve'],
['R', 'Remove (asks for a reason)'],
['W', 'Warn the vendor'],
['S', 'Suspend the vendor'],
['Shift + A', 'Approve selected'],
['Shift + R', 'Remove selected'],
['G', 'Show or hide guidelines'],
['?', 'Show or hide shortcuts']];


const DIALOG_COPY: Record<Action, {title: string;description: string;label: string;confirm: string;destructive: boolean;}> = {
  remove: { title: 'Remove this content?', description: 'It disappears from public pages straight away. The owner is told the reason and can appeal.', label: 'Reason (sent to the owner)', confirm: 'Remove', destructive: true },
  warn: { title: 'Warn the vendor?', description: 'They get a written warning with this reason. Nothing is removed.', label: 'Reason for the warning', confirm: 'Send warning', destructive: false },
  suspend: {
    title: 'Suspend this vendor?',
    description: 'Soft suspension, the same as a lapsed subscription: their profile stays visible as “temporarily unavailable”, they can’t get new requests, orders or quotes, and their current jobs, orders, payouts and data are kept.',
    label: 'Reason (sent to the vendor)',
    confirm: 'Suspend vendor',
    destructive: true
  },
  uphold: { title: 'Keep it removed?', description: 'The appeal is declined and the owner is told why.', label: 'Reason', confirm: 'Keep removed', destructive: true },
  overturn: { title: 'Reinstate this content?', description: 'The appeal is accepted and the content goes back exactly as it was.', label: 'Reason', confirm: 'Reinstate', destructive: false }
};

const inTypingContext = (el: EventTarget | null) =>
el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/** /admin/moderation — one queue with tabs, bulk actions, keyboard shortcuts and the guidelines beside it. */
export function ModerationSection() {
  const q = useModerationQueue();
  const { can } = useAdminSession();
  const [dialog, setDialog] = useState<{action: Action;ids: string[];} | null>(null);
  const [guidelines, setGuidelines] = useState(false);
  const [help, setHelp] = useState(false);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const canModerate = can(ADMIN_PERMISSION.ModerationReview);
  const canSuspend = can(ADMIN_PERMISSION.ModerationSuspend);
  const appealsTab = q.tab === MODERATION_TAB.Appeals;

  const act = (action: 'approve' | Action, ids: string[]) => {
    if (!canModerate || ids.length === 0) return;
    if (action === 'suspend' && !canSuspend) return;
    if (action === 'approve') void q.approve(ids);else
    setDialog({ action, ids });
  };

  // Keep the focused card on screen and focused (for J/K).
  useEffect(() => {
    if (q.focused) cardRefs.current.get(q.focused.id)?.focus({ preventScroll: false });
  }, [q.focused?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || inTypingContext(e.target) || dialog || document.querySelector('dialog[open]')) return;
      const id = q.focused?.id;
      const key = e.key;
      const handled = (() => {
        switch (key) {
          case 'j':case 'ArrowDown':
            q.moveFocus(1);return true;
          case 'k':case 'ArrowUp':
            q.moveFocus(-1);return true;
          case 'x':
            if (id) q.toggle(id);return true;
          case 'a':
            if (id && !appealsTab) act('approve', [id]);return true;
          case 'r':
            if (id && !appealsTab) act('remove', [id]);return true;
          case 'w':
            if (id && !appealsTab) act('warn', [id]);return true;
          case 's':
            if (id && !appealsTab) act('suspend', [id]);return true;
          case 'A':
            if (!appealsTab) act('approve', q.selectedIds);return true;
          case 'R':
            if (!appealsTab) act('remove', q.selectedIds);return true;
          case 'g':
            setGuidelines((v) => !v);return true;
          case '?':
            setHelp((v) => !v);return true;
          default:
            return false;
        }
      })();
      if (handled) e.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const tabOptions = Object.values(MODERATION_TAB).map((t) => ({ id: t, label: MODERATION_TAB_LABELS[t], count: q.counts[t] }));
  const copy = dialog ? DIALOG_COPY[dialog.action] : null;
  const many = (dialog?.ids.length ?? 0) > 1;

  function renderList() {
    if (q.status === 'error' && !q.data) return <ErrorState message={q.error ?? ''} onRetry={q.reload} />;
    if (!q.data) return <LoadingState label="Loading the moderation queue" rows={4} rowClassName="h-40" />;
    if (q.items.length === 0) {
      return (
        <EmptyState
          icon={ShieldCheckIcon}
          title={q.view === 'pending' ? 'All clear' : 'Nothing decided yet'}
          description={q.view === 'pending' ? `Nothing waiting in ${MODERATION_TAB_LABELS[q.tab]}.` : 'Decided items show here.'} />);


    }
    return (
      <ul className="space-y-3">
        {q.items.map((item, i) =>
        <li key={item.id}>
            <ModerationItemCard
            ref={(el) => {
              if (el) cardRefs.current.set(item.id, el);else
              cardRefs.current.delete(item.id);
            }}
            item={item}
            focused={i === q.focusIndex}
            selected={q.selected.has(item.id)}
            canModerate={canModerate}
            canSuspend={canSuspend}
            appealsTab={appealsTab}
            onFocus={() => q.setFocus(i)}
            onToggle={() => q.toggle(item.id)}
            onAction={(a) => act(a, [item.id])} />

          </li>
        )}
      </ul>);

  }

  return (
    <>
      <PageHeader
        title="Moderation"
        subtitle="Photos, reviews, catalogue items, reports and appeals"
        action={
        <div className="flex gap-2">
            <Button variant="highlight" size="sm" icon={BookOpenIcon} onClick={() => setGuidelines((v) => !v)} aria-pressed={guidelines}>
              Guidelines
            </Button>
            <Button variant="highlight" size="sm" icon={KeyboardIcon} onClick={() => setHelp((v) => !v)} aria-pressed={help} aria-label="Keyboard shortcuts" />
          </div>
        } />

      <PageContainer className="space-y-4">
        <SegmentedControl<ModerationTab> label="Queue" options={tabOptions} value={q.tab} onChange={q.setTab} />
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl<ModerationView>
            label="Show"
            options={[{ id: 'pending', label: appealsTab ? 'Waiting' : 'Pending' }, { id: 'decided', label: 'Decided' }]}
            value={q.view}
            onChange={q.setView} />

          {canModerate && q.view === 'pending' && q.items.length > 0 &&
          <Button variant="secondary" size="sm" onClick={q.selectAll}>
              Select all ({q.items.length})
            </Button>
          }
        </div>

        {help &&
        <section aria-labelledby="shortcuts-heading" className="rounded-2xl border border-line bg-white p-4">
            <h2 id="shortcuts-heading" className="font-bold">Keyboard shortcuts</h2>
            <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {SHORTCUTS.map(([k, label]) =>
            <div key={k} className="flex justify-between gap-3">
                  <dt><kbd className="rounded border border-line bg-sand px-1.5 font-mono text-xs">{k}</kbd></dt>
                  <dd className="text-muted">{label}</dd>
                </div>
            )}
            </dl>
          </section>
        }

        {q.selectedIds.length > 0 &&
        <div role="region" aria-label="Bulk actions" className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-pine bg-[#E3EEEC] px-4 py-3 lg:top-4">
            <p className="flex-1 text-sm font-bold">{q.selectedIds.length} selected</p>
            {appealsTab ?
          <Button size="sm" variant="outline" onClick={() => setDialog({ action: 'uphold', ids: q.selectedIds })}>Keep all removed</Button> :

          <>
                <Button size="sm" loading={q.busy === 'approve'} onClick={() => act('approve', q.selectedIds)}>Approve selected</Button>
                <Button size="sm" variant="danger" onClick={() => act('remove', q.selectedIds)}>Remove selected</Button>
              </>
          }
            <Button size="sm" variant="secondary" onClick={q.clearSelection}>Clear</Button>
          </div>
        }

        <div className={`grid gap-4 ${guidelines ? 'lg:grid-cols-[minmax(0,1fr)_340px]' : ''}`}>
          <div className="min-w-0 space-y-4">
            {renderList()}
            {q.focused && <AuditTrail type="moderation_item" id={q.focused.id} refreshKey={`${q.focused.status}:${q.focused.appeal?.status ?? ''}`} />}
          </div>
          {guidelines &&
          <div className="order-first lg:order-none lg:sticky lg:top-6 lg:self-start">
              <GuidelinesPanel onClose={() => setGuidelines(false)} />
            </div>
          }
        </div>
      </PageContainer>

      <ReasonDialog
        open={dialog !== null}
        title={copy ? many ? copy.title.replace('this content', `${dialog?.ids.length} items`) : copy.title : ''}
        description={copy?.description ?? ''}
        reasonLabel={copy?.label ?? 'Reason'}
        confirmLabel={copy ? many ? `${copy.confirm} ${dialog?.ids.length}` : copy.confirm : ''}
        presets={dialog?.action === 'remove' || dialog?.action === 'uphold' ? MODERATION_REMOVE_REASONS : dialog?.action === 'warn' || dialog?.action === 'suspend' ? MODERATION_WARN_REASONS : undefined}
        required
        destructive={copy?.destructive}
        onConfirm={async (reason) => {
          if (!dialog) return false;
          const { action, ids } = dialog;
          let ok: boolean;
          if (action === 'remove') ok = await q.remove(ids, reason);else
          if (action === 'warn') ok = await q.warn(ids[0], reason);else
          if (action === 'suspend') ok = await q.suspend(ids[0], reason);else
          {
            ok = true;
            for (const id of ids) ok = (await q.decideAppeal(id, action, reason)) && ok;
          }
          if (ok) setDialog(null);
          return ok;
        }}
        onCancel={() => setDialog(null)} />

    </>);

}
