import type { BadgeTone } from '../../../../components/ui/Badge';
import type { VendorImportStatus } from '../../bulk/types';

export const IMPORT_STATUS_META: Record<VendorImportStatus, {label: string;tone: BadgeTone;}> = {
  running: { label: 'Running', tone: 'info' },
  completed: { label: 'Completed', tone: 'success' },
  completed_with_errors: { label: 'Completed with errors', tone: 'warning' },
  undone: { label: 'Undone', tone: 'neutral' },
  partly_undone: { label: 'Partly undone', tone: 'neutral' }
};
