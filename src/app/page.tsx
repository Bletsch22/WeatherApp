"use client";

import { use, useState, type FormEvent } from "react";
import {
  loadWeatherByCity, 
  loadWeatherByCoords,
  type UiData,
  type Units,
  convertTemp,
  convertWind,
  labelsFor,
} from "@/lib/weather";

import { loadForecastByCity, loadForecastByCoords, type ForecastDay } from "@/lib/forecast"

import { getMoonPhase } from "@/lib/astro";
import { getMoonCalendar } from "@/lib/astro";


const moonCal = getMoonCalendar(8);
const moon = getMoonPhase();
//const { tUnit, windUnit } = labelsFor(units);
// Component state
export default function Home() {
  
  
  //const testDate = new Date(Date.UTC(2025 ,8, 21));
  const moon = getMoonPhase();

  // console.log("Moon debug", {
  //   fraction: moon.fraction.toFixed(3),
  //   age: (moon.fraction * 29.530588853).toFixed(2),
  //   label: moon.label,
  // });

  //Hooks
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("");
  const [units, setUnits] = useState<Units>("imperial"); // mph, °F default
  const [data, setData] = useState<UiData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[] | null>(null);
  const [last, setLast] = useState<{ lat: number; lon: Number; label: string} | null>(null);
  

  
  async function handleSearch(e: FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!city.trim()) 
    return;

    setStatus(`Searching "${city}"...`);
    setData(null);
    setForecast(null);

    try {
      const wx = await loadWeatherByCity(city, units);
      setData(wx);
      setLast(null);

      const fc = await loadForecastByCity(city, units);
      setForecast(fc);

      setStatus("");

    }catch (err){
      console.log(err);
      setStatus(err instanceof Error? err.message : "Something went wrong.");
    }
  }

  //Toggle from °F to °C
  async function toggleUnits() {
    
    const from: Units = units;
    const to: Units = from ==="imperial" ? "metric" : "imperial";
    setUnits(to);

    //local conversion first
    if(data) {
      setData({
        ...data,
        temp: Math.round(convertTemp(data.temp, from, to)),
        feels: Math.round(convertTemp(data.feels, from, to)),
        wind: Math.round(convertWind(data.wind, from, to))
      });
    }

    if(forecast?.length) {
      setForecast(
        forecast.map(d=> ({
          ...d,
          min: Math.round(convertTemp(d.min, from, to)),

          max: Math.round(convertTemp(d.max, from , to)),
        }))
      );
    }
  }

  // geolocation handler
  function handleGeoClick() {
    if (!navigator.geolocation) {
      setStatus("Geolocation not supported.");
      return;
    }

    setStatus("Detecting your location…");

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const wx = await loadWeatherByCoords(
            { lat: coords.latitude, lon: coords.longitude, label: "Your location" },
            units
          );
          setData(wx);
          setLast({ lat: coords.latitude, lon: coords.longitude, label: "Your location" });

          const fc = await loadForecastByCoords(
            { lat: coords.latitude, lon: coords.longitude },
            units
          );
          setForecast(fc);

          setStatus("");
        } catch (err) {
          console.error(err);
          setStatus(err instanceof Error ? err.message : "Something went wrong.");
        }
      },
    (err) => {
      const msg = err.code === 1
        ? "Permission denied. Please allow location access."
        : err.code === 2
        ? "Position unavailable."
        : err.code === 3
        ? "Location request timed out."
        : err.message || "Location error.";
        setStatus(msg);
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 }
    );
  }

  const tUnit = units === "imperial" ? "°F" : "°C";
  const windUnit = units === "imperial" ? "mph" : "m/s";

  return (
  <main style={styles.container}>
    <h1 style={styles.title}>Weather Lite</h1>

    <form onSubmit={handleSearch} style={styles.row}>
      <input
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="Search city…"
        aria-label="City"
        style={styles.input}
      />
      <button type="submit" style={styles.btn}>
        Search
      </button>
      <button
        type="button"
        onClick={toggleUnits}
        aria-pressed={units === "metric"}
        style={styles.btn}
      >
        {tUnit}
      </button>
      <button
        type="button"
        onClick={handleGeoClick}
        style={styles.btn}
        >
        My location
        </button>
      </form>


  {data && (
        
  <section style={styles.card}>
    <div style={styles.header}>
      <h2 style={{ margin: 0 }}>{data.label}</h2>
        <div style={styles.muted}>Updated {data.updated}</div>
    </div>

        <div style={styles.current}>
          <img src={data.icon} alt={data.desc} width={96} height={96} />
            <div>
              <div style={styles.bigTemp}>
                {data.temp}
                {tUnit}
            </div>
              <div style={styles.muted}>
                Feels like {data.feels}
                {tUnit}
              </div>
              <div style={{ textTransform: "capitalize", marginTop: 4 }}>{data.desc}</div>
            </div>
          </div>
          
          <div style={styles.metaGrid}>
            <Meta label="Humidity" value={`${data.humidity}%`} />
            <Meta label="Wind" value={`${data.wind} ${windUnit} ${data.windDir}`} />
            <Meta label="Pressure" value={`${data.pressure} hPa`} />
            <Meta label ="Moon" value={`${moon.label} ${moon.emoji} Illumination: ${moon.illumPercent}%`} />
            
          </div>
        </section>
  )}

{forecast && forecast.length > 0 && (
  <section style={styles.card}>
    <h3 style={{ margin: 0 }}>5-Day Forecast</h3>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginTop: 12 }}>
      {forecast.map((d) => (
        <div key={d.date} style={styles.metaBox}>
          <div style={{ textAlign: "center" }}><strong>{d.label}</strong></div>
          <div style={{ display: "grid", placeItems: "center" }}>
            <img src={d.icon} alt={d.desc} width={64} height={64} />
          </div>
          <div style={{ textAlign: "center", textTransform: "capitalize" }}>{d.desc}</div>
          <div style={{ textAlign: "center" }}>
            {d.min} / <strong>{d.max}</strong>
          </div>
        </div>
      ))}
    </div>
  </section>
)}
    <footer style={styles.footer}>
      <small style={styles.muted}>Powered by OpenWeather • Next.js + TypeScript</small>
    </footer>
  </main>
);
}





function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metaBox}>
      <span style={styles.muted}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100dvh",
    padding: 24,
    maxWidth: 820,
    margin: "0 auto",
    color: "#e6ecff",
    background: "radial-gradient(1000px 600px at 80% -10%, #1a2452, #0b1020)",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
    display: "grid",
    gap: 16,
  },
  title: { margin: 0, fontSize: "1.6rem", letterSpacing: 0.5 },
  row: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  input: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #2a3560",
    outline: "none",
    background: "#0f1527",
    color: "#e6ecff",
    width: 240,
  },
  btn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #2a3560",
    background: "#101832",
    color: "#e6ecff",
    cursor: "pointer",
  },
  status: { minHeight: 24, color: "#9fb0d9" },
  card: {
    borderRadius: 18,
    background: "linear-gradient(180deg, #141b2d, #0e1424)",
    border: "1px solid #202a4b",
    padding: 20,
    boxShadow: "0 10px 30px #00000050, inset 0 1px 0 #ffffff08",
    display: "grid",
    gap: 16,
  },
  header: { display: "flex", alignItems: "baseline", justifyContent: "space-between" },
  muted: { color: "#9fb0d9" },
  current: { display: "grid", gridTemplateColumns: "96px 1fr", gap: 12, alignItems: "center" },
  bigTemp: { fontSize: "3rem", lineHeight: 1 },
  metaGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  metaBox: {
    background: "#0d1322",
    border: "1px solid #1d2749",
    borderRadius: 12,
    padding: 12,
    display: "grid",
    gap: 4,
  },
  footer: { textAlign: "center", marginTop: 8 },
};
