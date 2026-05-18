export type DailyWeather = {
  date: string;
  available: boolean;
  condition: string | null;
  high_temp_c: number | null;
  low_temp_c: number | null;
  precipitation_chance: number | null;
  message?: string;
};
