import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { GeoPoint } from '../lib/location';

export type MeetingLocation = GeoPoint & { label: string };

async function requestPermission() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Location access is off. Enable it in your device settings and try again.');
  }
}

async function withTimeout<T>(request: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Location lookup timed out. Please try again.')), 20000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function requestUserLocation(): Promise<GeoPoint> {
  await requestPermission();
  const position = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

export async function describeLocation(point: GeoPoint, fallback: string): Promise<MeetingLocation> {
  if (Platform.OS === 'web') return { ...point, label: fallback };
  try {
    const [address] = await withTimeout(Location.reverseGeocodeAsync(point));
    const street = [address?.streetNumber, address?.street].filter(Boolean).join(' ');
    const label = [street || address?.name, address?.city, address?.region, address?.postalCode]
      .filter(Boolean).join(', ');
    return { ...point, label: label || fallback };
  } catch {
    return { ...point, label: fallback };
  }
}

export async function findMeetingLocations(query: string): Promise<MeetingLocation[]> {
  if (Platform.OS === 'web') {
    throw new Error('Address search is available in the iOS and Android app. You can use your current location here.');
  }
  if (Platform.OS === 'android') await requestPermission();
  const points = await withTimeout(Location.geocodeAsync(query.trim()));
  if (!points.length) throw new Error('No address found. Include the street, city, and state.');

  const results: MeetingLocation[] = [];
  for (const point of points.slice(0, 3)) {
    results.push(await describeLocation({ latitude: point.latitude, longitude: point.longitude }, query.trim()));
  }
  return results;
}
