import { CalendarDays, LayoutDashboard, Scissors, Users, Wallet, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  /** Shorter label for the phone tab bar. */
  short: string;
  icon: LucideIcon;
  /** Second key of the "G then …" shortcut. */
  key: string;
  end?: boolean;
}

// The admin's pages: the sidebar on desktop, the five-slot tab bar on phones.
export const NAV_ITEMS: NavItem[] = [
  { to: '/admin', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, key: 'd', end: true },
  { to: '/admin/appointments', label: 'Appointments', short: 'Bookings', icon: CalendarDays, key: 'a' },
  { to: '/admin/financial-report', label: 'Financial Report', short: 'Finance', icon: Wallet, key: 'f' },
  { to: '/admin/customers', label: 'Customers', short: 'Clients', icon: Users, key: 'c' },
  { to: '/admin/services', label: 'Services', short: 'Services', icon: Scissors, key: 's' },
];
