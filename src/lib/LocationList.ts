const KEY_LIST = "locations";
const KEY_LAST = "lastCity";

export function LoadLocations(): string[] {
  try {
    const raw = localStorage.getItem(KEY_LIST);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveLocations(list: string[]): void {
  localStorage.setItem(KEY_LIST, JSON.stringify(list));
}

export function addLocation(city: string): string[] {
  const trimmed = city.trim();
  if (!trimmed) return LoadLocations();

  const list = LoadLocations();
  if (!list.includes(trimmed)) {
    list.push(trimmed);
    saveLocations(list);
  }
  return list;
}

export function getLastCity(): string | null {
  return localStorage.getItem(KEY_LAST);
}

export function setLastCity(city: string): void {
  localStorage.setItem(KEY_LAST, city.trim());
}

// sets a location weather on startup page
export function initLocations(): {
  locations: string[];
  lastCity: string | null;
} {
  return { locations: LoadLocations(), lastCity: getLastCity() };
}

export function removeLocation(city: string): string[] {
  const list = LoadLocations().filter((c) => c !== city);
  saveLocations(list);
  const last = getLastCity();
  if (last === city) localStorage.removeItem(KEY_LAST);
  return list;
}
