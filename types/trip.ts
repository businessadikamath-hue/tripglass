export type BudgetStatus = "under_budget" | "near_budget" | "over_budget" | "unknown";

export type PlaceSource = "google_places" | "ai_estimate" | "user_input";

export type ItineraryCategory =
  | "attraction"
  | "restaurant"
  | "cafe"
  | "museum"
  | "nature"
  | "shopping"
  | "neighborhood"
  | "transport"
  | "break"
  | "hotel"
  | "nightlife"
  | "other";

export type TripItinerary = {
  title: string;
  destination: string;
  summary: string;
  days_count: number;
  currency: string;
  estimated_total_cost: number | null;
  budget_status: BudgetStatus;
  best_for: string[];
  neighborhoods: string[];
  travel_tips: string[];
  warnings: string[];
  budget_breakdown: {
    food: number | null;
    accommodation: number | null;
    activities: number | null;
    transit: number | null;
    miscellaneous: number | null;
    notes: string;
  };
  days: ItineraryDay[];
};

export type ItineraryDay = {
  day_number: number;
  date: string | null;
  title: string;
  summary: string;
  weather: {
    available: boolean;
    condition: string | null;
    high_temp_c: number | null;
    low_temp_c: number | null;
    packing_tip: string | null;
  };
  items: ItineraryItem[];
  backup_options: BackupOption[];
};

export type ItineraryItem = {
  start_time: string;
  end_time: string;
  title: string;
  description: string;
  category: ItineraryCategory;
  place: {
    name: string | null;
    google_place_id: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
    google_maps_url: string | null;
    source: PlaceSource;
  };
  estimated_cost: {
    amount: number | null;
    currency: string;
    confidence: "low" | "medium" | "high";
    note: string;
  };
  why_it_fits: string;
  transit_note: string | null;
  accessibility_note: string | null;
  booking_note: string | null;
};

export type BackupOption = {
  title: string;
  description: string;
  best_if: string;
  estimated_cost: number | null;
};

export type TripInput = {
  destination_text: string;
  destination_place_id?: string | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
  starting_city?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  days_count: number;
  budget_amount?: number | null;
  currency: string;
  travelers: number;
  pace: "relaxed" | "balanced" | "packed";
  travel_style: string;
  start_time_preference?: string | null;
  walking_tolerance?: string | null;
  interests: string[];
  food_preferences: string[];
  accessibility_needs: string[];
  must_see: string[];
  avoid: string[];
  notes?: string | null;
};

export type TripRecord = {
  id: string;
  user_id: string | null;
  title: string;
  destination_text: string;
  destination_place_id: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
  start_date: string | null;
  end_date: string | null;
  days_count: number;
  budget_amount: number | null;
  currency: string;
  travelers: number;
  travel_style: string | null;
  pace: string | null;
  interests: string[] | null;
  status: string | null;
  is_public: boolean | null;
  public_share_slug: string | null;
  input_snapshot: TripInput;
  itinerary_json: TripItinerary;
  ai_model: string | null;
  estimated_total_cost: number | null;
  created_at: string;
  updated_at: string;
};
