export type GeoResult = {
  name: string;
  lat: number;
  lon: number;
  state?: string;
  country: string;
};

export type ForecastResponse = {
  list: Array<{
    dt: number;
    dt_txt?: string; // string timestamp
    main: { temp: number; temp_min: number; temp_max: number };
    weather?: { description?: string; icon?: string; main?: string }[];
  }>;
  city?: { name: string; country?: string };
};

export type WeatherResponse = {
  dt: number;
  name: string;

  sys?: {
    country?: string;
  };

  weather?: {
    description?: string;
    icon?: string;
    main?: string;
  }[];

  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };

  wind: {
    speed: number;
    deg?: number;
  };

  clouds: {
    all: number;
  };
};
