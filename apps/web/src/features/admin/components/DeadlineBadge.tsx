import { Badge } from '../../../components/ui/Badge';
import { deadlineState, formatDuration } from '../utils/format';
import type { ResponseDeadline } from '../types';

/** A party's response countdown: due in, due soon, overdue, or answered. */
export function DeadlineBadge({ deadline, party, now = new Date() }: {deadline: ResponseDeadline | null;party: string;now?: Date;}) {
  const { state, minutesLeft } = deadlineState(deadline, now);
  if (state === 'none') return <Badge tone="neutral">{party}: nothing asked</Badge>;
  if (state === 'done') return <Badge tone="success" dot>{party}: replied</Badge>;
  if (state === 'overdue') return <Badge tone="danger" dot>{party}: overdue {formatDuration(minutesLeft)}</Badge>;
  return (
    <Badge tone={state === 'soon' ? 'warning' : 'info'} dot>
      {party}: {formatDuration(minutesLeft)} left
    </Badge>);

}
