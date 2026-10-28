import { useContext } from 'react';
import { RequestsContext, type RequestsContextValue } from '../context/requestsContext';

export function useRequests(): RequestsContextValue {
  const ctx = useContext(RequestsContext);
  if (!ctx) throw new Error('useRequests must be used within RequestsProvider');
  return ctx;
}
