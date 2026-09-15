import Constants from 'expo-constants';
import { Platform } from 'react-native';

const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
const webHost = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hostname : null;

export const API_BASE_URL = `http://${webHost ?? expoHost ?? '10.43.56.78'}:8000`;
const DEFAULT_USER_CODE = 'rojan-txst';

let currentUserCode = DEFAULT_USER_CODE;
let sessionToken: string | null = null;
const sessionListeners = new Set<() => void>();

export function getSessionToken() {
  return sessionToken;
}

export function subscribeSession(listener: () => void) {
  sessionListeners.add(listener);
  return () => { sessionListeners.delete(listener); };
}

function authHeaders(): Record<string, string> {
  if (!sessionToken) throw new Error('Please log in again.');
  return { Authorization: `Bearer ${sessionToken}` };
}

export function getCurrentUserCode() {
  return currentUserCode;
}

export function setCurrentUserCode(userCode: string) {
  const cleanCode = userCode.trim().toLowerCase();
  currentUserCode = cleanCode || DEFAULT_USER_CODE;
  return currentUserCode;
}

export function logoutUser() {
  const token = sessionToken;
  sessionToken = null;
  currentUserCode = DEFAULT_USER_CODE;
  sessionListeners.forEach((listener) => listener());
  if (token) {
    void fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }
}

export type CampusActivity = {
  id: number;
  title: string;
  group_name: string;
  period: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
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
  latitude: number;
  longitude: number;
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
  email?: string | null;
  date_of_birth?: string | null;
};

export type AuthInput = {
  email: string;
  password: string;
};

export type RegisterInput = AuthInput & {
  username: string;
  date_of_birth: string;
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

export type ChatMessage = {
  id: number;
  join_request_id: number;
  activity_id: number;
  sender_code: string;
  recipient_code: string;
  body: string;
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
  const ownProfile = userCode === getCurrentUserCode();
  const path = ownProfile ? 'me' : encodeURIComponent(userCode);
  const response = await fetch(`${API_BASE_URL}/profile/${path}`, {
    headers: ownProfile ? authHeaders() : {},
  });

  if (!response.ok) {
    throw new Error('Failed to load profile');
  }

  return response.json();
}

export async function updateProfile(
  profile: Pick<UserProfile, 'username' | 'bio' | 'photo_url'>,
  userCode = getCurrentUserCode()
) {
  if (userCode !== getCurrentUserCode()) throw new Error('You can only update your own profile.');
  const response = await fetch(`${API_BASE_URL}/profile/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    throw new Error('Failed to update profile');
  }

  return response.json();
}


async function authenticate(action: 'login' | 'register', auth: AuthInput | RegisterInput): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/auth/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(auth),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const detail = error?.detail;
    const message = typeof detail === 'string' ? detail : Array.isArray(detail)
      ? detail.map((issue: { msg: string }) => issue.msg).join('\n') : 'Could not connect. Please try again.';
    throw new Error(message);
  }

  const { profile, token } = await response.json();
  sessionToken = token;
  setCurrentUserCode(profile.user_code);
  sessionListeners.forEach((listener) => listener());
  return profile;
}

export function loginUser(auth: AuthInput) {
  return authenticate('login', auth);
}

export function createUser(auth: RegisterInput) {
  return authenticate('register', auth);
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

export async function getMessages(
  requestId: number,
  userCode = getCurrentUserCode()
): Promise<ChatMessage[]> {
  const response = await fetch(
    `${API_BASE_URL}/join-requests/${requestId}/messages?user_code=${encodeURIComponent(userCode)}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || 'Could not load messages');
  }

  return response.json();
}

export async function sendMessage(
  requestId: number,
  body: string,
  senderCode = getCurrentUserCode()
): Promise<ChatMessage> {
  const response = await fetch(`${API_BASE_URL}/join-requests/${requestId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender_code: senderCode, body }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || 'Could not send message');
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
