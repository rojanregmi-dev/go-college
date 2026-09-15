import Constants from 'expo-constants';

const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];

export const API_BASE_URL = `http://${expoHost ?? '10.43.56.78'}:8000`;

export type CampusActivity = {
  id: number;
  title: string;
  group_name: string;
  period: string;
  location: string;
  category: string;
  interested_count: number;
};

export type NewCampusActivity = {
  title: string;
  group_name: string;
  period: string;
  location: string;
  category: string;
  interested_count: number;
};

export type UserProfile = {
  id: number;
  username: string;
  user_code: string;
  bio: string;
  photo_url: string;
};

export async function saveAvailability(period: string) {
  const response = await fetch(`${API_BASE_URL}/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

export async function getActivities(): Promise<CampusActivity[]> {
  const response = await fetch(`${API_BASE_URL}/activities`);

  if (!response.ok) {
    throw new Error('Failed to load activities');
  }

  return response.json();
}

export async function createActivity(activity: NewCampusActivity) {
  const response = await fetch(`${API_BASE_URL}/activities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(activity),
  });

  if (!response.ok) {
    throw new Error('Failed to create activity');
  }

  return response.json();
}


export async function getProfile(): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/profile`);

  if (!response.ok) {
    throw new Error('Failed to load profile');
  }

  return response.json();
}

export async function updateProfile(profile: Pick<UserProfile, 'username' | 'bio' | 'photo_url'>) {
  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    throw new Error('Failed to update profile');
  }

  return response.json();
}


export async function uploadFile(uri: string, name = 'upload.jpg') {
  const formData = new FormData();

  formData.append('file', {
    uri,
    name,
    type: 'image/jpeg',
  } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/uploads`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }

  return response.json() as Promise<{ url: string }>;
}
