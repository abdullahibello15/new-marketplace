import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { formatNaira } from '../../../../utils/format';
import type { PendingPlanAction } from '../../hooks/useSubscription';

interface PlanActionDialogProps {
  action: PendingPlanAction | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const DEMO_NOTE = 'Payments aren’t connected yet, so no money will be taken.';

export function PlanActionDialog({ action, loading, onConfirm, onCancel }: PlanActionDialogProps) {
  const price = action ? `${formatNaira(action.plan.monthlyPrice)}/month` : '';
  const isRenew = action?.kind === 'renew';

  return (
    <ConfirmDialog
      open={action !== null}
      title={isRenew ? `Renew ${action?.plan.name ?? ''}?` : `Switch to ${action?.plan.name ?? ''}?`}
      description={
      isRenew ?
      `Adds one month at ${price}. ${DEMO_NOTE}` :
      `Your plan changes straight away to ${price}. Your renewal date stays the same. ${DEMO_NOTE}`
      }
      confirmLabel={isRenew ? 'Renew' : 'Switch plan'}
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel} />);


}
