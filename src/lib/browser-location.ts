type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
};

type NominatimResponse = {
  address?: NominatimAddress;
};

const getCurrentPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('GEOLOCATION_UNSUPPORTED'));
    return;
  }

  navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: false,
    maximumAge: 10 * 60 * 1000,
    timeout: 12000,
  });
});

export const detectBrowserLocation = async () => {
  if (typeof window === 'undefined') {
    throw new Error('GEOLOCATION_UNSUPPORTED');
  }

  const position = await getCurrentPosition();
  const { latitude, longitude } = position.coords;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=ru`,
      { cache: 'no-store' }
    );
    const data = (await response.json()) as NominatimResponse;
    const address = data.address ?? {};
    const city = address.city ?? address.town ?? address.village ?? address.municipality ?? address.county ?? address.state;
    const country = address.country;
    const label = [city, country].filter(Boolean).join(', ');

    if (label) return label;
  } catch {
    // Coordinates are still useful if reverse geocoding is temporarily unavailable.
  }

  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
};
