export const API_BASE_URL = 'http://' + '10.43.56.78:8000';

export async function saveAvailability(period: string) {
  const response = await fetch(`${API_BASE_URL}/availability`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_name: 'Rojan',
      period,
      is_available: true,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to save availability');
  }

  return response.json();
}
