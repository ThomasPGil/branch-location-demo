interface NominatimResult {
  lat: string;
  lon: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export class LocationNotFoundError extends Error {
  constructor() {
    super('No matching location was found');
    this.name = 'LocationNotFoundError';
  }
}

export async function getCoordinates(
  city: string,
  state: string,
  country: string,
): Promise<Coordinates> {
  const baseUrl = process.env.NOMINATIM_BASE_URL;
  const userAgent = process.env.NOMINATIM_USER_AGENT;

  if (!baseUrl) {
    throw new Error('NOMINATIM_BASE_URL environment variable is missing');
  }

  if (!userAgent) {
    throw new Error('NOMINATIM_USER_AGENT environment variable is missing');
  }

  const url = new URL('/search', baseUrl);

  url.search = new URLSearchParams({
    city: city.trim(),
    state: state.trim(),
    country: country.trim(),
    format: 'json',
    limit: '1',
  }).toString();

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': userAgent,
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(
      `Nominatim returned HTTP status ${response.status}`,
    );
  }

  const results = (await response.json()) as NominatimResult[];

  if (!Array.isArray(results) || results.length === 0) {
    throw new LocationNotFoundError();
  }

  const latitude = Number(results[0].lat);
  const longitude = Number(results[0].lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Nominatim returned invalid coordinates');
  }

  return {
    latitude,
    longitude,
  };
}