// Shapes of the salon's records, as kept by SalonProvider and AuthProvider.

export type HairLength = 'Short' | 'Medium' | 'Long';
export type ServiceGroup = 'Hair Services' | 'Promo Packages' | 'Add-ons' | 'Nail Services' | 'Bundle Promos' | 'Other';
export type ServiceCategory = 'Hair' | 'Nails' | 'Other';
export type AppointmentStatus = 'Pending' | 'Completed' | 'Cancelled';

export interface LengthPrices {
  short: number;
  medium: number;
  long: number;
}

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  group: ServiceGroup;
  /** 'length' = one price per hair length in `prices`; 'fixed' = the single `price`. */
  pricing: 'length' | 'fixed';
  price: number;
  prices: LengthPrices | null;
  /** Minutes. */
  duration: number;
  status: 'Active' | 'Inactive';
}

export interface Appointment {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  facebook: string;
  service: string;
  hairLength: HairLength | null;
  addOns: string[];
  price: number;
  date: string;
  time: string;
  status: AppointmentStatus;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  facebook: string;
  services: string[];
  walkIn: boolean;
  notes: string;
  registeredAt: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'credit' | 'debit';
  category: string;
  amount: number;
  notes: string;
}

/** The signed-in administrator, without credentials. */
export interface Account {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

/** Result of signing in or creating the administrator. `field` names the input at fault, when there is one. */
export interface AuthResult {
  ok: boolean;
  field?: string;
  message?: string;
}

export interface AuthValue {
  /** Null when signed out. */
  user: Account | null;
  /** False only when no built-in administrator is defined and none has been created yet. */
  hasAdmin: boolean;
  signIn(input: { email: string; password: string }): Promise<AuthResult>;
  createAdmin(input: { name: string; email: string; password: string }): Promise<AuthResult>;
  signOut(): void;
}

export interface SalonValue {
  customers: Customer[];
  services: Service[];
  appointments: Appointment[];
  transactions: Transaction[];
  // The provider is still plain JavaScript; its actions are documented where they are defined.
  actions: Record<string, (...args: any[]) => any>;
}
