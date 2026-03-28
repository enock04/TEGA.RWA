// ─────────────────────────────────────────────
// User & Auth
// ─────────────────────────────────────────────
export type UserRole = 'passenger' | 'agency' | 'admin';

export interface User {
  id: string;
  full_name: string;
  phone_number: string;
  email?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// ─────────────────────────────────────────────
// Stations & Routes
// ─────────────────────────────────────────────
export interface Station {
  id: string;
  name: string;
  city: string;
  province: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface Route {
  id: string;
  name: string;
  departure_station_id: string;
  arrival_station_id: string;
  departure_station: string;
  arrival_station: string;
  distance_km?: number;
  duration_minutes?: number;
}

// ─────────────────────────────────────────────
// Buses & Seats
// ─────────────────────────────────────────────
export type BusType = 'standard' | 'luxury' | 'minibus' | 'coach';
export type SeatClass = 'economy' | 'business' | 'vip';
export type SeatStatus = 'available' | 'booked';

export interface Bus {
  id: string;
  name: string;
  plate_number: string;
  bus_type: BusType;
  total_seats: number;
  agency_name?: string;
  amenities?: string[];
}

export interface Seat {
  id: string;
  seat_number: number;
  seat_class: SeatClass;
  position?: string;
  status: SeatStatus;
}

// ─────────────────────────────────────────────
// Schedules (search results)
// ─────────────────────────────────────────────
export interface Schedule {
  schedule_id: string;
  departure_time: string;
  arrival_time: string;
  base_price: number;
  available_seats: number;
  total_seats: number;
  schedule_status: string;
  bus_id: string;
  plate_number: string;
  bus_name: string;
  bus_type: BusType;
  amenities?: string[];
  route_id: string;
  route_name: string;
  distance_km?: number;
  duration_minutes?: number;
  departure_station_id: string;
  departure_station: string;
  departure_city: string;
  arrival_station_id: string;
  arrival_station: string;
  arrival_city: string;
}

// ─────────────────────────────────────────────
// Bookings
// ─────────────────────────────────────────────
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'used';

export interface Booking {
  id: string;
  user_id: string;
  schedule_id: string;
  seat_id: string;
  passenger_name: string;
  passenger_phone: string;
  passenger_email?: string;
  amount: number;
  status: BookingStatus;
  expires_at?: string;
  created_at: string;
  // Joined fields
  seat_number?: number;
  seat_class?: SeatClass;
  departure_time?: string;
  arrival_time?: string;
  bus_name?: string;
  plate_number?: string;
  route_name?: string;
  departure_station?: string;
  departure_city?: string;
  arrival_station?: string;
  arrival_city?: string;
  base_price?: number;
  special_assistance?: boolean;
}

// ─────────────────────────────────────────────
// Payments
// ─────────────────────────────────────────────
export type PaymentMethod = 'mtn_momo' | 'airtel_money' | 'bank_card' | 'cash';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  provider_reference?: string;
  initiated_at: string;
  completed_at?: string;
  failed_at?: string;
}

export interface PaymentInitiateResponse {
  paymentId: string;
  bookingId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  providerReference: string;
  status: string;
  message: string;
  instructions: string;
}

// ─────────────────────────────────────────────
// Tickets
// ─────────────────────────────────────────────
export interface Ticket {
  id: string;
  booking_id: string;
  ticket_number: string;
  qr_code_data: string;
  is_used: boolean;
  issued_at: string;
  // Joined booking fields
  passenger_name?: string;
  passenger_phone?: string;
  bus_name?: string;
  plate_number?: string;
  route_name?: string;
  departure_station?: string;
  arrival_station?: string;
  departure_time?: string;
  arrival_time?: string;
  seat_number?: number;
  amount?: number;
  special_assistance?: boolean;
}

// ─────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface SearchParams {
  departureStationId: string;
  destinationStationId: string;
  date: string;
}
