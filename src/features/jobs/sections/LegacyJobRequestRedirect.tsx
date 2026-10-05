import { Navigate, useParams } from 'react-router-dom';
import { JOB_ROUTES } from '../constants';

/** Old links used /vendor/:vendorId/request. Send them to the new job request form. */
export function LegacyJobRequestRedirect() {
  const { vendorId = '' } = useParams();
  return <Navigate to={JOB_ROUTES.request(vendorId)} replace />;
}
