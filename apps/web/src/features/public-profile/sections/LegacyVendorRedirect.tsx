import { Navigate, useParams } from 'react-router-dom';
import { vendorProfilePath } from '../constants';

/** Old links used /vendor/:vendorId. Send them to /vendors/:vendorId, replacing the history entry. */
export function LegacyVendorRedirect() {
  const { vendorId = '' } = useParams();
  return <Navigate to={vendorProfilePath(vendorId)} replace />;
}
