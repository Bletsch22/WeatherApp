import type { GeoResult, ForecastResponse } from "@/types/openweather";
import { type Units } from "./weather";

const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_KEY!;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(()=> "");
    throw new Error(`request failed: ${res.status} ${res.statusText} -${text}`);
  }
  return res.json() as Promise<T>;
}

export type ForecastDay = {
  date: string;
  label: string;
  min: number;
  max: number;
  icon: string;
  desc: string;
};

type GeoWant = {
state?: string; country?: string
};

// summarize 3- hour chunks into daily min/max + midday icon
function summarizeForecast(resp: ForecastResponse): ForecastDay[]{
  const byDay = new Map<string, ForecastResponse["list"]>();

  for (const item of resp.list ?? []){
    const iso = (item.dt_txt ?? new Date(item.dt * 1000).toISOString()).slice(0,10);
    if (!byDay.has(iso)) byDay.set(iso, []);
    byDay.get(iso)!.push(item);
  }

  const days: ForecastDay[] = [];
  for(const [iso, items] of Array.from(byDay.entries()).sort()){
    let min = Infinity, max = -Infinity;
    for (const it of items) {
      min = Math.min(min, it.main.temp_min);
      max = Math.max(max, it.main.temp_max);
    }
    const midday = items.find(it => (it.dt_txt ?? "").includes("12:00:00")) ?? items[Math.floor(items.length / 2)];
    const w = midday.weather?.[0];
    const icon = `https://openweathermap.org/img/wn/${w?.icon ?? "01d"}@2x.png`;
    const desc =w?.description ?? "-"

    const d = new Date(items[0].dt * 1000);
    const label = d.toLocaleDateString(undefined, {weekday: "short"});

    days.push({date: iso, label, min: Math.round(min), max: Math.round(max),icon, desc });
  }
  return days.slice(0,5);
}

export async function loadForecastByCoords(
  p: { lat: number; lon: number },
  units: Units
): Promise<ForecastDay[]> {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${p.lat}&lon=${p.lon}&units=${units}&appid=${API_KEY}`;
  const data = await fetchJson<ForecastResponse>(url);
  return summarizeForecast(data);
}

function buildForecastQuery(input: string): { qParam: string; want: GeoWant } {
  let raw = input.trim().replace(/\s+/g," ");
  let parts = input.split(",").map(s => s.trim()).filter(Boolean);

  if (parts.length ===1){
    const words = raw.split(" ");
    if( words.length > 1) {
      const city = words.slice(0,-1).join(" ");
      const region = words[words.length -1];
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
    if (/^[A-Z]{2}$/.test(st)) {               // City, ST  → assume US
      return { qParam: encodeURIComponent(`${city},${st},US`), want: { state: st, country: "US" } };
    }
    return { qParam: encodeURIComponent(`${city},${region}`), want: { country: st } }; // City, Country
  }

  const [city, state, country] = parts;        // City, State, Country
  return {
    qParam: encodeURIComponent(`${city},${state},${country}`),
    want: { state: state?.toUpperCase(), country: country?.toUpperCase() },
  };
}


export async function loadForecastByCity(q: string, units: Units) {
  const { qParam, want} = buildForecastQuery(q);
  const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${qParam}&limit=5&appid=${API_KEY}`;

  type GeoResultWithState = GeoResult & {state?: string};
  const geo = await fetchJson<GeoResult[]>(geoUrl);

  const pick = geo.find(g =>
  (want.country? g.country.toUpperCase() === want.country : true) &&
  (want.state ? (g.state?.toUpperCase() ?? "").startsWith(want.state) : true )
  ) ?? geo[0];


  const { lat, lon } = geo[0];
  return loadForecastByCoords({ lat, lon }, units);
}

