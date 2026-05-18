export type NormalizedPlace = {
  place_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  user_ratings_total: number | null;
  price_level: string | null;
  types: string[];
  website_url: string | null;
  google_maps_url: string | null;
};
