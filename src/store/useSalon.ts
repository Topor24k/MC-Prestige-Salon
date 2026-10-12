import { createContext, useContext } from 'react';
import type { Appointment, SalonValue } from '../types';

export const SalonContext = createContext<SalonValue | null>(null);

/** Salon data (customers, services, appointments, transactions) plus `actions`. */
export function useSalon(): SalonValue {
  const context = useContext(SalonContext);
  if (!context) throw new Error('useSalon must be used inside <SalonProvider>');
  return context;
}

/** The slot is taken when another non-cancelled booking has the same date and time. */
export function findConflict(appointments: Appointment[], date: string, time: string, excludeId?: string | null): Appointment | null {
  if (!date || !time) return null;
  return (
    appointments.find(
      (a) => a.id !== excludeId && a.status !== 'Cancelled' && a.date === date && a.time === time,
    ) || null
  );
}
