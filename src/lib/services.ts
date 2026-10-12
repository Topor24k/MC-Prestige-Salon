import { formatPeso } from './format';
import type { Appointment, HairLength, LengthPrices, Service } from '../types';

const LENGTH_KEY: Record<HairLength, keyof LengthPrices> = { Short: 'short', Medium: 'medium', Long: 'long' };

type Maybe<T> = T | null | undefined;
type LengthPriced = Service & { prices: LengthPrices };

/** True when the service is priced by hair length (Short / Medium / Long). */
export const isLengthPriced = (service: Maybe<Service>): service is LengthPriced =>
  Boolean(service && service.pricing === 'length' && service.prices);
export const isAddOn = (service: Maybe<Service>): boolean => service?.group === 'Add-ons';
/** Services a customer can book on their own: active, and not an add-on. */
export const isBookable = (service: Maybe<Service>): boolean => service?.status === 'Active' && !isAddOn(service);

/** Price of one service for a hair length; flat-priced services ignore the length. */
export function priceFor(service: Maybe<Service>, hairLength?: HairLength | ''): number {
  if (!service) return 0;
  if (!isLengthPriced(service)) return service.price || 0;
  return (hairLength ? service.prices[LENGTH_KEY[hairLength]] : undefined) ?? service.price ?? 0;
}

/** Total for a service plus any add-ons at the same hair length. */
export function quote(service: Maybe<Service>, hairLength?: HairLength | '', addOns: Service[] = []): number {
  return priceFor(service, hairLength) + addOns.reduce((total, addOn) => total + priceFor(addOn, hairLength), 0);
}

export const lowestPrice = (service: Maybe<Service>): number =>
  isLengthPriced(service) ? Math.min(service.prices.short, service.prices.medium, service.prices.long) : service?.price || 0;

/** "₱799 – ₱1,499" for length pricing, "₱150" for a flat price. */
export function priceLabel(service: Maybe<Service>): string {
  if (!isLengthPriced(service)) return formatPeso(service?.price || 0, { whole: true });
  const values = [service.prices.short, service.prices.medium, service.prices.long];
  const low = Math.min(...values);
  const high = Math.max(...values);
  return low === high ? formatPeso(low, { whole: true }) : `${formatPeso(low, { whole: true })} – ${formatPeso(high, { whole: true })}`;
}

/** "Color · Medium + Rebond Sensitive Hair" — how a booking's service reads in lists. */
export function bookingLabel(appointment: Pick<Appointment, 'service' | 'hairLength' | 'addOns'>): string {
  const length = appointment.hairLength ? ` · ${appointment.hairLength}` : '';
  const extras = appointment.addOns?.length ? ` + ${appointment.addOns.join(' + ')}` : '';
  return `${appointment.service}${length}${extras}`;
}

export const findService = (services: Service[], name: Maybe<string>): Service | null =>
  services.find((s) => s.name.toLowerCase() === String(name || '').toLowerCase()) || null;

/** What a booking is worth: the price saved with it, or the catalog's current lowest price. */
export function bookingValue(appointment: Pick<Appointment, 'price' | 'service'>, services: Service[]): number {
  if (Number.isFinite(appointment.price)) return appointment.price;
  return lowestPrice(findService(services, appointment.service));
}
