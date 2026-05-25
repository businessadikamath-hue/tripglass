export type DuffelFlightSegment = {
  carrierName: string | null;
  flightNumber: string | null;
  originIata: string;
  destinationIata: string;
  departureAt: string;
  arrivalAt: string;
  duration: string | null;
};

export type DuffelFlightOffer = {
  id: string;
  source: "duffel";
  originIata: string;
  destinationIata: string;
  totalAmount: number;
  currency: string;
  ownerName: string | null;
  slices: Array<{
    duration: string | null;
    segments: DuffelFlightSegment[];
  }>;
  expiresAt: string | null;
  checkedAt: string;
};

export type DuffelHotelOffer = {
  id: string;
  source: "duffel";
  hotelId: string;
  hotelName: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: number;
  currency: string;
  roomType: string | null;
  cancellationDescription: string | null;
  checkedAt: string;
};

export type DuffelTravelOffers = {
  provider: "duffel";
  configured: boolean;
  enabled: boolean;
  checkedAt: string;
  originIata: string | null;
  destinationIata: string | null;
  flightOffers: DuffelFlightOffer[];
  hotelOffers: DuffelHotelOffer[];
  warnings: string[];
};
