import type { AmadeusTravelOffers } from "@/types/amadeus";

export type LivePricingSummary = {
  provider: "amadeus";
  checked_at: string;
  flight_offer: {
    id: string;
    origin_iata: string;
    destination_iata: string;
    total_amount: number;
    currency: string;
    validating_airline_codes: string[];
    departure_at: string | null;
    arrival_at: string | null;
    last_ticketing_date: string | null;
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

export type TravelOfferBundle = AmadeusTravelOffers;
