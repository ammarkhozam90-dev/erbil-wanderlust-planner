export type TourStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type TourCategory =
  | 'city' | 'historical' | 'nature' | 'adventure' | 'food' | 'night'
  | 'photography' | 'family' | 'luxury' | 'shopping' | 'religious' | 'custom';
export type TourDifficulty = 'easy' | 'moderate' | 'hard';

export interface TourOrganizer {
  id: string;
  owner_id: string;
  company_name: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  bio: string;
  logo_url: string | null;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tour {
  id: string;
  organizer_id: string;
  slug: string | null;
  title: string;
  short_description: string;
  full_description: string;
  category: TourCategory;
  meeting_point: string;
  meeting_lat: number | null;
  meeting_lng: number | null;
  destination: string;
  duration_type: string;
  duration_custom: string;
  languages: string[];
  max_guests: number | null;
  min_guests: number | null;
  included: string[];
  not_included: string[];
  requirements: string[];
  difficulty: TourDifficulty;
  features: string[];
  mood_tags: string[];
  target_audience: string[];
  best_time: string[];
  season: string[];
  walking_distance_km: number | null;
  transportation_type: string | null;
  cover_url: string | null;
  adult_price: number | null;
  child_price: number | null;
  private_price: number | null;
  currency: string;
  discount_percent: number;
  booking_deadline_hours: number;
  status: TourStatus;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TourDestination {
  id: string;
  tour_id: string;
  sort_order: number;
  name: string;
  description: string;
  arrival_time: string | null;
  departure_time: string | null;
  visit_duration_min: number | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
}

export interface TourPhoto {
  id: string;
  tour_id: string;
  kind: 'gallery' | 'destination' | 'vehicle';
  url: string;
  caption: string;
  sort_order: number;
  created_at: string;
}

export interface TourAvailability {
  id: string;
  tour_id: string;
  day_of_week: number | null;
  specific_date: string | null;
  max_bookings: number | null;
  is_fully_booked: boolean;
  is_recurring: boolean;
}
