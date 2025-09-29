"use client";

//weather + Forecast domain helpers
// NOTE: If any of these helpers use process.env directly at the top level,
// add the guard shown above to avoid "process is not defined" in the browser.
import Image from "next/image";
import { type FormEvent, useEffect, useRef, useState } from "react";
// ===== Astronomy helpers =====
import { getMoonPhase } from "@/lib/astro";

import {
  type ForecastDay,
  type HourPoint,
  loadForecastByCity,
  loadForecastByCoords,
  loadHourlyByCity,
  loadHourlyByCoords,
} from "@/lib/forecast";
// ===== Saved locations helpers =====
import {
  addLocation,
  initLocations,
  removeLocation,
  setLastCity,
} from "@/lib/LocationList";
// ===== Weather + Forecast domain helpers =====
// NOTE: If any of these helpers use process.env directly at the top level,
// add the guard shown above to avoid "process is not defined" in the browser.
import {
  convertTemp,
  convertWind,
  labelForCoords,
  loadWeatherByCity,
  loadWeatherByCoords,
  type UiData,
  type Units,
} from "@/lib/weather";

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

  const [hourly, setHourly] = useState<HourPoint[] | null>(null);
  const [showHourly, setShowHourly] = useState(true); // default showing hourly

  // fetch hourly for current city (or coords if available)

  async function loadHourly() {
    if (city.trim()) {
      const hrs = await loadHourlyByCity(city, units, 12);
      setHourly(hrs);
    } else if (data?.coords) {
      // if your UiData has coords; if not, rely on city only
      const hrs = await loadHourlyByCoords(
        { lat: (data as any).coords.lat, lon: (data as any).coords.lon },
        units,
        12,
      );
      setHourly(hrs);
    } else if (data?.label) {
      const hrs = await loadHourlyByCity(data.label, units, 12);
      setHourly(hrs);
    }
  }

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
        })),
      );
    }

    if (hourly?.length) {
      setHourly(
        hourly.map((h) => ({
          ...h,
          temp: Math.round(convertTemp(h.temp, from, to)),
          wind: Math.round(convertWind(h.wind, from, to)),
        })),
      );
    }
  }

  // geolocation handler
  function handleGeoClick() {
    if (!navigator.geolocation) return;

    // setStatus("Detecting your location…");

    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        // reverse goecode to a friendly label
        const label = await labelForCoords(coords.latitude, coords.longitude);

        // load weather/forecast using that label
        const wx = await loadWeatherByCoords(
          {
            lat: coords.latitude,
            lon: coords.longitude,
            label: `${label}`,
          },
          units,
        );
        setData(wx);

        const fc = await loadForecastByCoords(
          { lat: coords.latitude, lon: coords.longitude },
          units,
        );
        setForecast(fc);
        setCity(label);

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

  // ...your imports unchanged

  return (
    <main className="page" style={styles.container}>
      <h1 className="title" style={styles.title}>
        Kyle&apos;s Weather Report
      </h1>

      <form onSubmit={handleSearch} className="controls" style={styles.row}>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Search city…"
          aria-label="City"
          className="textInput"
          style={{ ...styles.input, width: "min(100%, 320px)" }} // ← was 240
        />
        <button type="submit" className="btn" style={styles.btn}>
          Search
        </button>
        <button
          type="button"
          onClick={toggleUnits}
          aria-pressed={units === "metric"}
          className="btn"
          style={styles.btn}
        >
          {tUnit}
        </button>
        <button
          type="button"
          onClick={handleGeoClick}
          className="btn"
          style={styles.btn}
        >
          My location
        </button>
      </form>

      {/* save location drop down */}
      <div
        className="saveRow"
        style={{
          marginTop: 12,
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          className="btn"
          onClick={handleSaveLocation}
          style={styles.btn}
        >
          Save Location
        </button>

        <SavedLocationsDropdown
          value={selectedCity}
          options={locations}
          onChange={(val) => {
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
        <section className="card" style={styles.card}>
          {/* HEADER */}
          <div className="cardHeader" style={styles.header}>
            <h2 style={{ margin: 0 }}>{data.label}</h2>
            <button
              type="button"
              className="btn"
              style={styles.btn}
              onClick={async () => {
                setShowHourly((s) => !s);
                if (!hourly) await loadHourly();
              }}
              aria-pressed={showHourly}
            >
              Hourly Forecast
            </button>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={styles.muted}>Updated {data.updated}</div>
            </div>
          </div>

          {/* TODAY GRID: left = current, right = meta */}
          <div className="todayGrid">
            {/* LEFT: current conditions */}
            <div className="currentBlock">
              <div className="currentRow">
                <Image
                  src={data.icon}
                  alt={data.desc}
                  width={80}
                  height={80}
                  sizes="80px"
                />
                <div className="currentText">
                  <div className="bigTemp" style={styles.bigTemp}>
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
                  <div> Coverage: {data.clouds}%</div>
                </div>
              </div>
            </div>

            {/* RIGHT: meta 2×2 */}
            <div className="metaGrid" style={styles.metaGrid}>
              <div style={styles.cellMoon}>
                <Meta
                  label="Moon"
                  value={`${moon.label} ${moon.emoji} Illumination: ${moon.illumPercent}%`}
                />
              </div>
              <div style={styles.cellHumid}>
                <Meta label="Humidity" value={`${data.humidity}%`} />
              </div>
              <div style={styles.cellWind}>
                <Meta
                  label="Wind"
                  value={`${data.wind} ${windUnit}, From: ${data.windDir} `}
                />
              </div>
              <div style={styles.cellPressure}>
                <Meta label="Pressure" value={`${data.pressure} hPa`} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Hourly panel */}
      {showHourly && hourly && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 8,
            marginTop: 8,
          }}
        >
          {hourly.map((h) => (
            <div key={h.dt} style={styles.metaBox}>
              <div style={{ textAlign: "center", fontWeight: 600 }}>
                {h.time}
              </div>
              <div style={{ display: "grid", placeItems: "center" }}>
                <Image
                  src={h.icon}
                  alt={h.desc}
                  width={48}
                  height={48}
                  sizes="48px"
                />
              </div>
              <div style={{ textAlign: "center" }}>
                {h.temp}
                {tUnit}
              </div>
              <div style={{ textAlign: "center", textTransform: "capitalize" }}>
                {h.desc}
              </div>
              <div style={{ textAlign: "center" }}>
                {h.wind} {windUnit}
              </div>
            </div>
          ))}
        </div>
      )}

      {forecast && forecast.length > 0 && (
        <section className="card" style={styles.card}>
          <h3 style={{ margin: 0 }}>5-Day Forecast</h3>
          <div
            className="forecastGrid"
            style={{
              display: "grid",
              // auto-fit cards; on phones this becomes 1–2 per row
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
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
                  <Image
                    src={d.icon}
                    alt={d.desc}
                    width={64}
                    height={64}
                    sizes="64px"
                  />
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

      {/* --- mobile responsiveness --- */}
      <style jsx>{`
  /* Make text sizes adapt a bit */
  .title { font-size: clamp(1.2rem, 2.5vw, 1.6rem); }
  .bigTemp { font-size: clamp(2.2rem, 6vw, 3rem); }

  /* Stack search controls and make them finger-friendly on narrow screens */
  @media (max-width: 640px) {
    .controls {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }
    .textInput,
    .btn {
      width: 100%;
      padding: 14px 14px; /* ≥44px tall */
    }
    .current {
      grid-template-columns: 64px 1fr !important;
      gap: 10px;
    }
    .saveRow { gap: 6px; }
  }
    /* Two-column layout for Today area */
.todayGrid {
  display: grid;
  gap: 16px;
}

/* LEFT side (current) layout */
.currentRow {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 12px;
  align-items: center;
}
.currentText {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* RIGHT side (meta) layout */
@media (min-width: 801px) {
  .todayGrid {
    grid-template-columns: 320px 1fr; /* left fixed-ish, right flexible */
    align-items: start;
  }
  .metaGrid {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      "moon  humid"
      "wind  pressure";
  }
}

/* Mobile/tablet: stack in one column in desired order */
@media (max-width: 800px) {
  .todayGrid {
    grid-template-columns: 1fr;
  }
  .metaGrid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "moon"
      "wind"
      "humid"
      "pressure";
  }
}


  /* Today meta grid layout */
  @media (min-width: 641px) {
    .metaGrid {
      grid-template-columns: 1fr 1fr;
      grid-template-areas:
        "moon  humid"
        "wind  pressure";
    }
  }
  @media (max-width: 640px) {
    .metaGrid {
      grid-template-columns: 1fr;
      grid-template-areas:
        "moon"
        "wind"
        "humid"
        "pressure";
    }
  }

  /* Slightly tighten layout on very small phones */
  @media (max-width: 380px) {
    .page { padding: 16px !important; }
  }

  /* Reduce motion if user prefers */
  @media (prefers-reduced-motion: reduce) {
    * { scroll-behavior: auto; }
  }
`}</style>
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

  // function handleSelect(val: string) {
  //   onChange(val);
  //   setOpen(false);
  // }

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
          {options.length === 0 && (
            <div style={{ ...styles.dropdownItem, opacity: 0.7 }}>
              (no saved locations yet)
            </div>
          )}

          {options.map((opt) => (
            <div key={opt} style={styles.dropdownRow}>
              <button
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                style={{
                  ...styles.dropdownItem,
                  ...(opt === value ? styles.dropdownItemActive : null),
                }}
                role="option"
                aria-selected={opt === value}
              >
                {opt}
              </button>

              <button
                type="button"
                onClick={() => onDelete(opt)}
                title="Remove"
                aria-label={`Remove ${opt}`}
                style={styles.deleteIconBtn}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="#9fb0d9"
                  aria-hidden
                >
                  <path d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7A1 1 0 0 0 5.7 7.1L10.6 12l-4.9 4.9a1 1 0 1 0 1.4 1.4L12 13.4l4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z" />
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
    // minHeight: "100dvh",
    padding: 24,
    //maxwidth: 820,
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

  metaGrid: {
    display: "grid",
    gap: 8,
  },

  cellMoon: { gridArea: "moon" },
  cellHumid: { gridArea: "humid" },
  cellWind: { gridArea: "wind" },
  cellPressure: { gridArea: "pressure" },

  metaBox: {
    background: "#0d1322",
    border: "1px solid #1d2749",
    borderRadius: 12,
    padding: 12,
    display: "grid",
    gap: 4,
    placeItems: "center",
    textAlign: "center",
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
