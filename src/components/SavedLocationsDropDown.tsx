// src/components/SavedLocationsDropdown.tsx
"use client";

import { useEffect, useRef, useState } from "react";

const styles = {
  btn: {
    background: "#0f1527",
    color: "#e6ecff",
    border: "1px solid #1d2749",
    padding: "8px 12px",
    borderRadius: 12,
    boxShadow: "0 2px 10px #00000030, inset 0 1px 0 #ffffff10",
    cursor: "pointer",
    fontSize: 14,
  } as React.CSSProperties,
  dropdownRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties,
  dropdownItem: {
    flex: 1,
    textAlign: "left",
    background: "transparent",
    border: "none",
    color: "#e6ecff",
    padding: "8px 10px",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 14,
  } as React.CSSProperties,
  dropdownItemActive: {
    background: "#1b2340",
    outline: "1px solid #28325c",
  } as React.CSSProperties,
  deleteIconBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 6,
    borderRadius: 8,
  } as React.CSSProperties,
};

export default function SavedLocationsDropdown(props: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onDelete: (value: string) => void;
}) {
  const { value, options, onChange, onDelete } = props;
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ ...styles.btn, paddingRight: 32, position: "relative" }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Saved locations"
      >
        {label}
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
          aria-hidden
        >
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>

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
