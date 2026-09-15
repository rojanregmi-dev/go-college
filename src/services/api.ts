import Constants from 'expo-constants';

const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];

export const API_BASE_URL = `http://${expoHost ?? '10.43.56.78'}:8000`;
const DEFAULT_USER_CODE = 'rojan-txst';

let currentUserCode = DEFAULT_USER_CODE;

export function getCurrentUserCode() {
  return currentUserCode;
}

export function setCurrentUserCode(userCode: string) {
  const cleanCode = userCode.trim().toLowerCase();
  currentUserCode = cleanCode || DEFAULT_USER_CODE;
  return currentUserCode;
}

export function logoutUser() {
  currentUserCode = DEFAULT_USER_CODE;
}

export type CampusActivity = {
  id: number;
  title: string;
  group_name: string;
  period: string;
  location: string;
  category: string;
  description: string;
  photo_url: string;
  creator_code: string;
  creator_photo_url: string;
  max_people: number;
  accepted_count: number;
  spots_left: number | null;
  interested_count: number;
};

export type NewCampusActivity = {
  title: string;
  group_name: string;
  period: string;
  location: string;
  category: string;
  description: string;
  photo_url: string;
  creator_code: string;
  creator_photo_url: string;
  max_people: number;
  interested_count: number;
};

export type UserProfile = {
  id: number;
  username: string;
  user_code: string;
  bio: string;
  photo_url: string;
};

export type AuthInput = {
  user_id: string;
  password: string;
  username?: string;
};

export type JoinRequest = {
  id: number;
  activity_id: number;
  activity_title: string;
  activity_category: string;
  activity_period: string;
  activity_location: string;
  requester_code: string;
  requester_name: string;
  requester_photo_url: string;
  creator_code: string;
  status: 'pending' | 'accepted' | 'denied';
  created_at: string;
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

export async function deleteActivity(
  activityId: number,
  creatorCode = getCurrentUserCode()
) {
  const response = await fetch(
    `${API_BASE_URL}/activities/${activityId}?creator_code=${encodeURIComponent(creatorCode)}`,
    { method: 'DELETE' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || 'Could not delete post');
  }

  return response.json();
}


export async function getProfile(userCode = getCurrentUserCode()): Promise<UserProfile> {
  const cleanCode = setCurrentUserCode(userCode);
  const response = await fetch(`${API_BASE_URL}/profile/${encodeURIComponent(cleanCode)}`);

  if (!response.ok) {
    throw new Error('Failed to load profile');
  }

  return response.json();
}

export async function updateProfile(
  profile: Pick<UserProfile, 'username' | 'bio' | 'photo_url'>,
  userCode = getCurrentUserCode()
) {
  const cleanCode = setCurrentUserCode(userCode);
  const response = await fetch(`${API_BASE_URL}/profile/${encodeURIComponent(cleanCode)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    throw new Error('Failed to update profile');
  }

  return response.json();
}


export async function loginUser(auth: AuthInput): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(auth),
  });

  if (!response.ok) {
    throw new Error('Invalid User ID or password');
  }

  const profile = await response.json();
  setCurrentUserCode(profile.user_code);
  return profile;
}

export async function createUser(auth: AuthInput): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(auth),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || 'Could not create account');
  }

  const profile = await response.json();
  setCurrentUserCode(profile.user_code);
  return profile;
}


export async function createJoinRequest(
  activityId: number,
  requesterCode = getCurrentUserCode()
): Promise<JoinRequest> {
  const response = await fetch(`${API_BASE_URL}/join-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      activity_id: activityId,
      requester_code: requesterCode,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || 'Could not send request');
  }

  return response.json();
}

export async function getIncomingJoinRequests(
  creatorCode = getCurrentUserCode()
): Promise<JoinRequest[]> {
  const response = await fetch(
    `${API_BASE_URL}/join-requests/incoming/${encodeURIComponent(creatorCode)}`
  );

  if (!response.ok) {
    throw new Error('Failed to load incoming requests');
  }

  return response.json();
}

export async function getOutgoingJoinRequests(
  requesterCode = getCurrentUserCode()
): Promise<JoinRequest[]> {
  const response = await fetch(
    `${API_BASE_URL}/join-requests/outgoing/${encodeURIComponent(requesterCode)}`
  );

  if (!response.ok) {
    throw new Error('Failed to load outgoing requests');
  }

  return response.json();
}

export async function updateJoinRequestStatus(
  requestId: number,
  status: 'accepted' | 'denied',
  creatorCode = getCurrentUserCode()
): Promise<JoinRequest> {
  const response = await fetch(`${API_BASE_URL}/join-requests/${requestId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creator_code: creatorCode,
      status,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || 'Could not update request');
  }

  return response.json();
}

export async function cancelJoinRequest(
  requestId: number,
  requesterCode = getCurrentUserCode()
) {
  const response = await fetch(
    `${API_BASE_URL}/join-requests/${requestId}?requester_code=${encodeURIComponent(requesterCode)}`,
    { method: 'DELETE' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || 'Could not cancel request');
  }

  return response.json();
}


export async function uploadFile(
  uri: string,
  name?: string,
  type?: string,
  folder = 'misc'
) {
  const cleanUri = uri.split('?')[0];
  const uriName = cleanUri.split('/').pop();
  const fileName = name || uriName || 'upload.jpg';
  const extension = fileName.split('.').pop()?.toLowerCase();
  const inferredType =
    type ||
    (extension === 'png'
      ? 'image/png'
      : extension === 'webp'
        ? 'image/webp'
      : extension === 'heic' || extension === 'heif'
          ? 'image/heic'
          : 'image/jpeg');

  const formData = new FormData();

  formData.append('file', {
    uri,
    name: fileName,
    type: inferredType,
  } as any);
  formData.append('folder', folder);

  return new Promise<{ url: string }>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open('POST', `${API_BASE_URL}/uploads`);

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve(JSON.parse(request.responseText));
        return;
      }

      reject(new Error(request.responseText || 'Failed to upload file'));
    };

    request.onerror = () => {
      reject(new Error('Network error while uploading file'));
    };

    request.send(formData);
  });
}
