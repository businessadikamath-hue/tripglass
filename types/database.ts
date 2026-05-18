import type { TripInput, TripItinerary } from "@/types/trip";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          home_city: string | null;
          default_currency: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          home_city?: string | null;
          default_currency?: string | null;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
          home_city?: string | null;
          default_currency?: string | null;
        };
        Relationships: [];
      };
      trips: {
        Row: {
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
          food_preferences: string[] | null;
          accessibility_needs: string[] | null;
          must_see: string[] | null;
          avoid: string[] | null;
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
        Insert: Partial<Database["public"]["Tables"]["trips"]["Row"]> & {
          title: string;
          destination_text: string;
          days_count: number;
          input_snapshot: TripInput;
          itinerary_json: TripItinerary;
        };
        Update: Partial<Database["public"]["Tables"]["trips"]["Row"]>;
        Relationships: [];
      };
      trip_revisions: {
        Row: {
          id: string;
          trip_id: string | null;
          user_id: string | null;
          instruction: string;
          previous_itinerary_json: Json | null;
          revised_itinerary_json: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id?: string | null;
          user_id?: string | null;
          instruction: string;
          previous_itinerary_json?: Json | null;
          revised_itinerary_json?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["trip_revisions"]["Row"]>;
        Relationships: [];
      };
      saved_places: {
        Row: {
          id: string;
          user_id: string | null;
          google_place_id: string | null;
          name: string;
          address: string | null;
          lat: number | null;
          lng: number | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["saved_places"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["saved_places"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
