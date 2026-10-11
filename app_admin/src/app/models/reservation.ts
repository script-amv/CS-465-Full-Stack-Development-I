import { Trip } from './trip';
export interface Reservation {
  _id: string;
  customer: { _id: string; name: string; email: string } | null;
  tripCode: string;
  trip: Omit<Trip, 'code'>;
  travellers: number;
  total: number;
  status: 'confirmed' | 'cancelled';
}
