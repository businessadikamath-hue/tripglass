import type { DuffelTravelOffers } from "@/types/duffel";

export type LivePricingSummary = {
  provider: "duffel";
  checked_at: string;
  flight_offer: {
    id: string;
    origin_iata: string;
    destination_iata: string;
    total_amount: number;
    currency: string;
    airline_name: string | null;
    departure_at: string | null;
    arrival_at: string | null;
    expires_at: string | null;
  } | null;
  hotel_offer: {
    id: string;
    hotel_id: string;
    hotel_name: string;
    total_amount: number;
    currency: string;
    check_in_date: string;
    check_out_date: string;
    lat: number | null;
    lng: number | null;
  } | null;
  notes: string[];
};

export type TravelOfferBundle = DuffelTravelOffers;
