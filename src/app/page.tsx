"use client";

//weather + Forecast domain helpers
// NOTE: If any of these helpers use process.env directly at the top level,
// add the guard shown above to avoid "process is not defined" in the browser.
import Image from "next/image";
import { useEffect, useState, useRef, type FormEvent } from "react";

// ===== Weather + Forecast domain helpers =====
// NOTE: If any of these helpers use process.env directly at the top level,
// add the guard shown above to avoid "process is not defined" in the browser.
import {
  loadWeatherByCity,
  loadWeatherByCoords,
  type UiData,
  type Units,
  convertTemp,
  convertWind,
} from "@/lib/weather";

import {
  loadForecastByCity,
  loadForecastByCoords,
  type ForecastDay,
} from "@/lib/forecast";

// ===== Astronomy helpers =====
import { getMoonPhase } from "@/lib/astro";

// ===== Saved locations helpers =====
import {
  initLocations,
  addLocation,
  setLastCity,
  removeLocation,
} from "@/lib/LocationList";

const moon = getMoonPhase(); // Today's moon phase (fraction in [0..1))

// Component: Home
export default function Home() {
  //Hooks or React State
  const [city, setCity] = useState("");

  const [units, setUnits] = useState<Units>("imperial"); // mph, °F default
  const [data, setData] = useState<UiData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[] | null>(null);

  const [locations, setLocations] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>("");

  //
  async function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!city.trim()) return;

    // setStatus(`Searching "${city}"...`);
    setData(null);
    setForecast(null);

    try {
      const wx = await loadWeatherByCity(city, units);
      setData(wx);

      const fc = await loadForecastByCity(city, units);
      setForecast(fc);

      // setStatus("");
    } catch (err) {
      console.log(err);
      // setStatus(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  //Toggle from °F to °C
  async function toggleUnits() {
    const from: Units = units;
    const to: Units = from === "imperial" ? "metric" : "imperial";
    setUnits(to);

    //local conversion first
    if (data) {
      setData({
        ...data,
        temp: Math.round(convertTemp(data.temp, from, to)),
        feels: Math.round(convertTemp(data.feels, from, to)),
        wind: Math.round(convertWind(data.wind, from, to)),
      });
    }

    if (forecast?.length) {
      setForecast(
        forecast.map((d) => ({
          ...d,
          min: Math.round(convertTemp(d.min, from, to)),

          max: Math.round(convertTemp(d.max, from, to)),
        }))
      );
    }
  }

  // geolocation handler
  function handleGeoClick() {
    if (!navigator.geolocation) {
      // setStatus("Geolocation not supported.");
      return;
    }

    // setStatus("Detecting your location…");

    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const wx = await loadWeatherByCoords(
          {
            lat: coords.latitude,
            lon: coords.longitude,
            label: "Your location",
          },
          units
        );
        setData(wx);

        const fc = await loadForecastByCoords(
          { lat: coords.latitude, lon: coords.longitude },
          units
        );
        setForecast(fc);

        // setStatus("");
      } catch (err) {
        console.error(err);
        // setStatus(
        //   err instanceof Error ? err.message : "Something went wrong."
        // );
      }
    });
  }

  // save location button handler
  function handleSaveLocation(): void {
    if (!city.trim()) return;
    const updated = addLocation(city);
    setLocations(updated);
    setSelectedCity(city);
    setLastCity(city);
  }

  // Delete handler
  function handleDeleteLocation(cityToDelete: string): void {
    const updated = removeLocation(cityToDelete);
    setLocations(updated);

    // if we delete the currently selected city, clear the selection(or pick another)
    if (selectedCity === cityToDelete) {
      setSelectedCity("");
      setData(null);
      setForecast(null);
    }
  }

  const tUnit = units === "imperial" ? "°F" : "°C";
  const windUnit = units === "imperial" ? "mph" : "m/s";

  useEffect(() => {
    const { locations, lastCity } = initLocations();
    setLocations(locations);
    if (lastCity) {
      setSelectedCity(lastCity);
      loadWeatherByCity(lastCity, units).then(setData);
      loadForecastByCity(lastCity, units).then(setForecast);
    }
  }, [units]);

  return (
    <main style={styles.container}>
      <h1 style={styles.title}>Kyle&apos;s Weather Report</h1>

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
        <button type="button" onClick={handleGeoClick} style={styles.btn}>
          My location
        </button>
      </form>

      {/* save location drop down*/}
      <div
        style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}
      >
        <button type="button" onClick={handleSaveLocation} style={styles.btn}>
          Save Location
        </button>

        <SavedLocationsDropdown
          value={selectedCity}
          options={locations}
          onChange={(val) => {
            // replicate your handlePickSaved behavior
            setSelectedCity(val);
            setLastCity(val);
            if (val) {
              loadWeatherByCity(val, units).then(setData);
              loadForecastByCity(val, units).then(setForecast);
            } else {
              setData(null);
              setForecast(null);
            }
          }}
          onDelete={(cityToDelete) => {
            handleDeleteLocation(cityToDelete);
          }}
        />
      </div>

      {data && (
        <section style={styles.card}>
          <div style={styles.header}>
            <h2 style={{ margin: 0 }}>{data.label}</h2>
            <div style={styles.muted}>Updated {data.updated}</div>
          </div>

          <div style={styles.current}>
            <Image src={data.icon} alt={data.desc} width={96} height={96} />
            <div>
              <div style={styles.bigTemp}>
                {data.temp}
                {tUnit}
              </div>
              <div style={styles.muted}>
                Feels like {data.feels}
                {tUnit}
              </div>
              <div style={{ textTransform: "capitalize", marginTop: 4 }}>
                {data.desc}
              </div>
            </div>
          </div>

          <div style={styles.metaGrid}>
            <Meta label="Humidity" value={`${data.humidity}%`} />
            <Meta
              label="Wind"
              value={`${data.wind} ${windUnit} ${data.windDir}`}
            />
            <Meta label="Pressure" value={`${data.pressure} hPa`} />
            <Meta
              label="Moon"
              value={`${moon.label} ${moon.emoji} Illumination: ${moon.illumPercent}%`}
            />
          </div>
        </section>
      )}

      {forecast && forecast.length > 0 && (
        <section style={styles.card}>
          <h3 style={{ margin: 0 }}>5-Day Forecast</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 8,
              marginTop: 12,
            }}
          >
            {forecast.map((d) => (
              <div key={d.date} style={styles.metaBox}>
                <div style={{ textAlign: "center" }}>
                  <strong>{d.label}</strong>
                </div>
                <div style={{ display: "grid", placeItems: "center" }}>
                  <Image src={d.icon} alt={d.desc} width={64} height={64} />
                </div>
                <div
                  style={{ textAlign: "center", textTransform: "capitalize" }}
                >
                  {d.desc}
                </div>
                <div style={{ textAlign: "center" }}>
                  {d.min} / <strong>{d.max}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <footer style={styles.footer}>
        <small style={styles.muted}>
          Powered by OpenWeather • Next.js + TypeScript
        </small>
      </footer>
    </main>
  );
}
//new for dropdown
function SavedLocationsDropdown(props: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onDelete: (value: string) => void;
}) {
  const { value, options, onChange, onDelete } = props;
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  function handleSelect(val: string) {
    onChange(val);
    setOpen(false);
  }

  // Close when clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const node = wrapperRef.current;
      if (!node) return;
      if (!node.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const label = value || "-- Select Location --";

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      {/* Trigger button styled like your bubble button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ ...styles.btn, paddingRight: 32, position: "relative" }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Saved locations"
      >
        {label}
        {/* Chevron */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="#e6ecff"
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            opacity: 0.9,
          }}
          aria-hidden="true"
          focusable="false"
        >
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {/* Popover menu */}
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            minWidth: 220,
            background: "#0f1527",
            border: "1px solid #1d2749",
            borderRadius: 12,
            boxShadow: "0 10px 30px #00000050, inset 0 1px 0 #ffffff08",
            padding: 6,
            zIndex: 50,
          }}
        >
          {options.map((opt) => (
            <div key={opt} style={styles.dropdownRow}>
              {/* City label (click to select) */}
              <button
                type="button"
                onClick={() => handleSelect(opt)}
                style={{
                  ...styles.dropdownItem,
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  ...(opt === value ? styles.dropdownItemActive : null),
                }}
                role="option"
                aria-selected={opt === value}
              >
                {opt}
                {/* Inline delete icon */}
                <svg
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(opt);
                  }}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="#e6ecff"
                  style={{
                    marginLeft: 8,
                    cursor: "pointer",
                    flexShrink: 0,
                    opacity: 0.85,
                  }}
                >
                  <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM6 9h2v9H6V9z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
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
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
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
  header: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  muted: { color: "#9fb0d9" },
  current: {
    display: "grid",
    gridTemplateColumns: "96px 1fr",
    gap: 12,
    alignItems: "center",
  },
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
  selectBtn: {
    padding: "10px 32px 10px 12px",
    borderRadius: 12,
    border: "1px solid #2a3560",
    background: "#101832",
    color: "#e6ecff",
    cursor: "pointer",
    boxShadow: "0 10px 30px #00000050, inset 0 1px 0 #ffffff08",

    // less boxy
    minWidth: 160,
    lineHeight: 1.2,

    // hide the native arrow
    appearance: "none" as const,
    WebkitAppearance: "none" as const,
    MozAppearance: "none" as const,

    // ensure consistent text
    font: "inherit",
    boxSizing: "border-box",
  },
  selectOption: {
    background: "#0f1527",
    color: "#e6ecff",
  },
  dropdownRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  dropdownItem: {
    width: "100%",
    textAlign: "left" as const,
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid transparent",
    background: "transparent",
    color: "#e6ecff",
    cursor: "pointer",
  },
  dropdownItemActive: {
    borderColor: "#2a3560",
    background: "#101832",
  },
  deleteIconBtn: {
    borderRadius: 8,
    border: "1px solid #1d2749",
    background: "#101832",
    padding: 6,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  },
};
