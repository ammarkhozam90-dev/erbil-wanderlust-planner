export const TOUR_CATEGORIES = [
  { value: 'city', label: 'City Tour' },
  { value: 'historical', label: 'Historical' },
  { value: 'nature', label: 'Nature' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'food', label: 'Food Tour' },
  { value: 'night', label: 'Night Tour' },
  { value: 'photography', label: 'Photography' },
  { value: 'family', label: 'Family' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'religious', label: 'Religious' },
  { value: 'custom', label: 'Custom' },
] as const;

export const DURATION_OPTIONS = [
  { value: 'half_day', label: 'Half Day' },
  { value: '1_day', label: '1 Day' },
  { value: '2_days', label: '2 Days' },
  { value: '3_days', label: '3 Days' },
  { value: 'custom', label: 'Custom' },
] as const;

export const DIFFICULTY = [
  { value: 'easy', label: 'Easy' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'hard', label: 'Hard' },
] as const;

export const TOUR_FEATURES = [
  'Hotel Pickup', 'Airport Pickup', 'Meals Included', 'Professional Guide',
  'English Guide', 'Arabic Guide', 'Kurdish Guide', 'Transport Included',
  'Entry Tickets Included', 'Family Friendly', 'Wheelchair Accessible',
  'Photography Friendly', 'Pet Friendly',
];

export const MOOD_TAGS = [
  'Adventure','Nature','History','Luxury','Family',
  'Photography','Culture','Relaxing','Nightlife','Food','Budget',
];

export const TARGET_AUDIENCE = ['Solo','Couples','Families','Groups','Business Travelers'];
export const BEST_TIME = ['Morning','Afternoon','Sunset','Night'];
export const SEASONS = ['Spring','Summer','Autumn','Winter'];
export const TRANSPORTATION_TYPES = ['Walking','Private Car','Bus','Mixed'];
export const LANGUAGES = ['English','Arabic','Kurdish','Turkish','Persian','French','German'];
export const CURRENCIES = ['USD','EUR','IQD'];
