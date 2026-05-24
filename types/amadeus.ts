export type AmadeusFlightSegment = {
  carrierCode: string;
  flightNumber: string;
  departureIata: string;
  arrivalIata: string;
  departureAt: string;
  arrivalAt: string;
  duration: string | null;
};

export type AmadeusFlightOffer = {
  id: string;
  source: "amadeus";
  originIata: string;
  destinationIata: string;
  totalAmount: number;
  currency: string;
  validatingAirlineCodes: string[];
  oneWay: boolean;
  itineraries: Array<{
    duration: string | null;
    segments: AmadeusFlightSegment[];
  }>;
  lastTicketingDate: string | null;
  checkedAt: string;
};

export type AmadeusHotelOffer = {
  id: string;
  source: "amadeus";
  hotelId: string;
  hotelName: string;
  lat: number | null;
  lng: number | null;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: number;
  currency: string;
  roomType: string | null;
  rateCode: string | null;
  boardType: string | null;
  cancellationDescription: string | null;
  paymentType: string | null;
  checkedAt: string;
};

export type AmadeusTravelOffers = {
  provider: "amadeus";
  configured: boolean;
  enabled: boolean;
  checkedAt: string;
  originIata: string | null;
  destinationIata: string | null;
  flightOffers: AmadeusFlightOffer[];
  hotelOffers: AmadeusHotelOffer[];
  warnings: string[];
};
