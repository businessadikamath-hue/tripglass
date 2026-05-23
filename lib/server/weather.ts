import { addDays, format, parseISO } from "date-fns";
import type { DailyWeather } from "@/types/weather";

const weatherCodes: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Cloudy",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  95: "Thunderstorms",
};

export async function getDailyWeather(
  lat?: number | null,
  lng?: number | null,
  startDate?: string | null,
  endDate?: string | null,
  daysCount = 1,
): Promise<DailyWeather[]> {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return [];
  }

  const safeDaysCount = Math.min(Math.max(daysCount, 1), 16);
  const effectiveStartDate = startDate || format(new Date(), "yyyy-MM-dd");
  const effectiveEndDate =
    endDate || format(addDays(parseISO(effectiveStartDate), safeDaysCount - 1), "yyyy-MM-dd");

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("start_date", effectiveStartDate);
  url.searchParams.set("end_date", effectiveEndDate);

  const response = await fetch(url, { next: { revalidate: 60 * 60 } });

  if (!response.ok) {
    if (response.status === 400) {
      return [
        {
          date: effectiveStartDate,
          available: false,
          condition: null,
          high_temp_c: null,
          low_temp_c: null,
          precipitation_chance: null,
          message: "Forecast unavailable this far ahead.",
        },
      ];
    }
    throw new Error(`Weather request failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    daily?: {
      time?: string[];
      weather_code?: number[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      precipitation_probability_max?: number[];
    };
  };

  return (data.daily?.time ?? []).map((date, index) => ({
    date,
    available: true,
    condition: weatherCodes[data.daily?.weather_code?.[index] ?? -1] ?? "Forecast",
    high_temp_c: data.daily?.temperature_2m_max?.[index] ?? null,
    low_temp_c: data.daily?.temperature_2m_min?.[index] ?? null,
    precipitation_chance:
      data.daily?.precipitation_probability_max?.[index] ?? null,
  }));
}
