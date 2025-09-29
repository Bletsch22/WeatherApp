import type { ForecastResponse, GeoResult } from "@/types/openweather";
import { fetchJson, type Units } from "./weather";

const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_KEY!;

// Hourly forecast types + loaders(Next 12hrs by default)

export type HourPoint = {
  dt: number;
  time: string;
  temp: number;
  icon: string;
  desc: string;
  wind: number;
};

export type ForecastDay = {
  date: string;
  label: string;
  min: number;
  max: number;
  icon: string;
  desc: string;
};

type GeoWant = {
  state?: string;
  country?: string;
};

export async function loadHourlyByCity(
  city: string,
  units: Units,
  hours = 12,
): Promise<HourPoint[]> {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
    city,
  )}&units=${units}&appid=${API_KEY}`;
  const res = await fetchJson<any>(url);
  return res.list
    .slice(0, Math.max(1, Math.ceil(hours / 2))) // 3-hour steps
    .flatMap((it: any) => {
      const date = new Date(it.dt * 1000);
      const time = date.toLocaleTimeString([], { hour: "numeric" });
      const icon = `https://openweathermap.org/img/wn/${it.weather[0].icon}@2x.png`;
      return [
        {
          dt: it.dt,
          time,
          temp: Math.round(it.main.temp),
          icon,
          desc: it.weather[0].description as string,
          wind: Math.round(it.wind.speed),
        } as HourPoint,
      ];
    });
}

export async function loadHourlyByCoords(
  coords: { lat: number; lon: number },
  units: Units,
  hours = 12,
): Promise<HourPoint[]> {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&units=${units}&appid=${API_KEY}`;
  const res = await fetchJson<any>(url);
  return res.list
    .slice(0, Math.max(1, Math.ceil(hours / 2)))
    .flatMap((it: any) => {
      const date = new Date(it.dt * 1000);
      const time = date.toLocaleTimeString([], { hour: "numeric" });
      const icon = `https://openweathermap.org/img/wn/${it.weather[0].icon}@2x.png`;
      return [
        {
          dt: it.dt,
          time,
          temp: Math.round(it.main.temp),
          icon,
          desc: it.weather[0].description as string,
          wind: Math.round(it.wind.speed),
        } as HourPoint,
      ];
    });
}

// summarize 3- hour chunks into daily min/max + midday icon
type WithTz = { city?: { timezone?: number } };

function getTz(resp: ForecastResponse & WithTz): number {
  const tz = resp.city?.timezone;
  return typeof tz === "number" ? tz : 0;
}

function summarizeForecast(resp: ForecastResponse): ForecastDay[] {
  const tz = getTz(resp); //seconds offset from UTC

  // helpers to work in "local" time for the forecast location
  const toLocalDate = (utcSeconds: number) =>
    new Date((utcSeconds + tz) * 1000);
  const dayKeyOf = (utcSeconds: number) => {
    const d = toLocalDate(utcSeconds);
    //Build YYYY-MM-DD from the "local" (offset-adjusted) date using UTC getters
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const localHour = (utcSeconds: number) =>
    toLocalDate(utcSeconds).getUTCHours();

  const weekdayShort = (utcSeconds: number) => {
    const d = toLocalDate(utcSeconds);
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
  };
  // group by local calender day
  const byDay = new Map<string, ForecastResponse["list"]>();
  for (const item of resp.list ?? []) {
    const key = dayKeyOf(item.dt);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)?.push(item);
  }

  // build per-day summaries
  const days: ForecastDay[] = [];
  for (const [iso, items] of Array.from(byDay.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    // min/max over that day
    let min = Infinity,
      max = -Infinity;
    for (const it of items) {
      min = Math.min(min, it.main.temp_min);
      max = Math.max(max, it.main.temp_max);
    }
    // 3) pick a representative item near local noon; prefer daytime ('d')
    // compute |hour - 12|, with a small penalty if pod === 'n'

    let best = items[0];
    let bestScore = Number.POSITIVE_INFINITY;
    for (const it of items) {
      const hr = localHour(it.dt);
      const score = Math.abs(hr - 12);

      if (score < bestScore) {
        bestScore = score;
        best = it;
      }
    }

    const w = best.weather?.[0];
    const icon = `https://openweathermap.org/img/wn/${w?.icon ?? "01d"}@2x.png`;
    const desc = w?.description ?? "-";
    const label = weekdayShort(items[0].dt);

    days.push({
      date: iso,
      label,
      min: Math.round(min),
      max: Math.round(max),
      icon,
      desc,
    });
  }
  return days.slice(0, 5);
}

export async function loadForecastByCoords(
  p: { lat: number; lon: number },
  units: Units,
): Promise<ForecastDay[]> {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${p.lat}&lon=${p.lon}&units=${units}&appid=${API_KEY}`;
  const data = await fetchJson<ForecastResponse>(url);
  return summarizeForecast(data);
}

function buildForecastQuery(input: string): { qParam: string; want: GeoWant } {
  const raw = input.trim().replace(/\s+/g, " ");
  let parts = input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 1) {
    const words = raw.split(" ");
    if (words.length > 1) {
      const city = words.slice(0, -1).join(" ");
      const region = words[words.length - 1];
      parts = [city, region];
    }
  }

  if (parts.length === 1) {
    const [city] = parts;
    return { qParam: encodeURIComponent(city), want: {} };
  }

  if (parts.length === 2) {
    const [city, region] = parts;
    const st = region.toUpperCase();
    if (/^[A-Z]{2}$/.test(st)) {
      // City, ST  → assume US
      return {
        qParam: encodeURIComponent(`${city},${st},US`),
        want: { state: st, country: "US" },
      };
    }
    return {
      qParam: encodeURIComponent(`${city},${region}`),
      want: { country: st },
    }; // City, Country
  }

  const [city, state, country] = parts; // City, State, Country
  return {
    qParam: encodeURIComponent(`${city},${state},${country}`),
    want: { state: state?.toUpperCase(), country: country?.toUpperCase() },
  };
}

export async function loadForecastByCity(q: string, units: Units) {
  const { qParam } = buildForecastQuery(q);
  const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${qParam}&limit=5&appid=${API_KEY}`;

  const geo = await fetchJson<GeoResult[]>(geoUrl);

  if (!geo?.length) throw new Error("No matching city found.");
  const { lat, lon } = geo[0];
  return loadForecastByCoords({ lat, lon }, units);
}
