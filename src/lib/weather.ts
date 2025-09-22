import type { GeoResult, WeatherResponse } from "@/types/openweather";

const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_KEY ?? "";

// Types and helpers

export type Units = "imperial" | "metric"; // limits to only two kinds of units

// temp conversions
export const fToC = (f: number) => (f - 32) * (5 / 9);
export const cToF = (c: number) => c * (9 / 5) + 32;

export const convertTemp = (n: number, from: Units, to: Units) =>
  from === to ? n : to === "metric" ? fToC(n) : cToF(n);

//speed conversions
export const mphToMs = (mph: number) => mph * 0.44704;
export const msToMph = (ms: number) => ms / 0.44704;

export const convertWind = (n: number, from: Units, to: Units) =>
  from === to ? n : to === "metric" ? mphToMs(n) : msToMph(n);

//Labels for display
export const labelsFor = (u: Units) => ({
  tUnit: u === "imperial" ? "°F" : "°C",
  windUnit: u === "imperial" ? "mph" : "m/s",
});

export type UiData = {
  label: string; // e.g 'Fri'
  updated: string;
  icon: string; // full icon URL
  desc: string;
  temp: number;
  feels: number; // what temperature feels like
  humidity: number; // sweaty balls
  wind: number; // speed
  windDir: string; // compass direction
  pressure: number; // barometric pressure
};
type GeoWant = {
  state?: string;
  country?: string;
};

//generic fetcher
export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Request failed: ${res.status} ${res.statusText} — ${text}`
    );
  }
  return res.json() as Promise<T>;
}

export async function labelForCoords(lat:number, lon: number): Promise<string> {
  const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;
  const rev = await fetchJson<GeoResult[]>(url);

  if(!rev?.length)return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  const {name, state, country } =rev[0];
  return [name, state, country].filter(Boolean).join(", ")
}


function buildWeatherQuery(input: string): { qParam: string; want: GeoWant } {
  // Normalize tokens: "City", or"City, ST", or "City, State, Country", or "City, Country" // this is a helper function for loadWeatherByCity()

  let raw = input.trim().replace(/\s+,/g, ","); // remove spaces before commas
  
  if (!raw.includes(",")) {

    raw = raw.replace(/^(.*\S)\s+(\S+){2,3}$/, "$1, $2")
  }

  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);

  if (parts.length === 1) {
    const city = parts[0];
    return { qParam: encodeURIComponent(city), want: {} };
  }

  if (parts.length === 2) {
    const [city, region] = parts;
    const st = region.toUpperCase();

    // IF it is 2 letter region  assume US
    if (/^[A-Z]{2}$/.test(st)) {
      //*
      return {
        qParam: encodeURIComponent(`${city},${region},US`), 
        want: { state: st, country: "US" },
      };
    }
    return {
      qParam: encodeURIComponent(`${city},${region}`), 
      want: { country: st },
    };
  }

  // 3+ tokens: pass first three as "City, State, Country"
  const [city, state, country] = parts;

  return {
    qParam: encodeURIComponent(`${city},${state},${country}`),
    want: { state: state?.toUpperCase(), country: country?.toUpperCase() },
  };
}

// geoCoding + weather in one call
export async function loadWeatherByCity(q: string,units: Units): Promise<UiData> {
  const { qParam, want } = buildWeatherQuery(q);

  const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${qParam}&limit=5&appid=${API_KEY}`;

  const geo = await fetchJson<GeoResult[]>(geoUrl);

  if (!geo?.length) throw new Error("No matching city found.");

  const pick =
    geo.find(
      (g) =>
        (want.country ? g.country?.toUpperCase() === want.country : true) &&
        (want.state ? (g.state?.toUpperCase() ?? "") === want.state : true)
    ) ?? geo[0];

  const { lat, lon, name, state, country } = pick;

  return loadWeatherByCoords(
    { lat, lon, label: [name, state, country].filter(Boolean).join(", ") },
    units
  );
}

// compass degree to direction conversions
function degToCompass(deg: number | undefined): string {
  if (deg === undefined || Number.isNaN(deg)) return "-";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

export async function loadWeatherByCoords(
  p: { lat: number; lon: number; label: string },
  units: Units
): Promise<UiData> {
  const wxUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${p.lat}&lon=${p.lon}&units=${units}&appid=${API_KEY}`;
  const wx = await fetchJson<WeatherResponse>(wxUrl);

  const icon = `https://openweathermap.org/img/wn/${wx.weather?.[0]?.icon ?? "01d"}@2x.png`;
  const updated = new Date(wx.dt * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    label: p.label,
    updated,
    icon,
    desc: wx.weather?.[0]?.description ?? "-",
    temp: Math.round(wx.main.temp),
    feels: Math.round(wx.main.feels_like),
    humidity: wx.main.humidity,
    wind: Math.round(wx.wind.speed),
    windDir: degToCompass(wx.wind.deg),
    pressure: wx.main.pressure,
  };
}
