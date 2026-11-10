import { apiClient } from "./apiClient";
import { tryRefreshAfterUnauthorized } from "./authSession";
import { Guess, GuessUser } from "../types";

interface LoginResponse {
  user: GuessUser;
  token: string;
}
// interface SignupResponse {
//   message: String,
//   user: GuessUser,
//   token: string
// }


// export const saveUser = async (newUser: Record<string, any>): Promise<SignupResponse>=> {
//   console.log(newUser)
//   const response = await fetch('/api/users/save', {
//       method: 'POST',
//       headers: {
//           'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(newUser),
//   });
//   if (!response.ok) {
//       throw new Error('Failed to save user');
//   }

//   const data: SignupResponse = await response.json()

//   console.log(response)
//   console.log("saved user data", response)

//   localStorage.setItem('jwt', data.token);
//   localStorage.setItem('user', JSON.stringify(data.user));


//   return data;
// }

export const saveUser = async (newUser: Record<string, any>) => {
  console.log("new user?", newUser)
  const data = await apiClient<LoginResponse>('/api/users/save', {
    method: 'POST',
    body: newUser,
    auth: false,
  });

  console.log("saved user data", data)

  localStorage.setItem('jwt', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));

  return data;
};


export const loginUser = async (name: string, access_key: string) => {
  const data = await apiClient<LoginResponse>('/api/users/recover', {
    method: 'POST',
    body: { name, access_key },
    auth: false, // no token needed for login
  });

  console.log("logged in", data)

  // Save token in localStorage
  localStorage.setItem('jwt', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));

  return data;
};

export interface FriendPreview {
  name: string;
  short_id: string;
  followers_count: number;
  prediction_count: number;
  friends_in_common: number;
  is_self: boolean;
  is_following: boolean;
}

export interface FollowedUserRivalryRecord {
  you: number;
  them: number;
  ties: number;
}

export interface FollowedUser {
  name: string;
  short_id: string;
  followers_count: number;
  prediction_count: number;
  last_guess_at: string | null;
  /** Titles both you and this friend have predicted. */
  shared_count: number;
  /** Finished head-to-head wins only (ties counted separately). */
  record: FollowedUserRivalryRecord;
  /** TMDB poster paths for shared titles (max 5; finished first). */
  shared_posters: string[];
  /** True when they also follow you. */
  follows_you: boolean;
}

/** Follower who does not appear on your Following list yet. */
export interface FollowBackUser {
  name: string;
  short_id: string;
}

export class FriendGuessesAccessError extends Error {
  status: number;
  user?: FriendPreview;

  constructor(message: string, status: number, user?: FriendPreview) {
    super(message);
    this.name = "FriendGuessesAccessError";
    this.status = status;
    this.user = user;
  }
}

const codePath = (code: string) =>
  `/api/users/code/${encodeURIComponent(code.trim().toUpperCase())}`;

export const getUserByCode = async (code: string) =>
  (await apiClient<{ user: FriendPreview }>(codePath(code))).user;

/** `mutual` is for invite links, where the sharer has opted in to following back. */
export const followByCode = async (code: string, mutual = false) =>
  (await apiClient<{ user: FollowedUser }>(`${codePath(code)}/follow`, {
    method: "POST",
    body: { mutual },
  })).user;

export const unfollowByCode = (code: string) =>
  apiClient(`${codePath(code)}/follow`, { method: "DELETE" });

export const getMyFollowing = async () =>
  apiClient<{ following: FollowedUser[]; follow_back: FollowBackUser[] }>(
    "/api/users/me/following"
  );

type FriendGuessesResponse = {
  status: number;
  user: FriendPreview;
  data: Guess[];
};

/** Friend (or self) guesses board — 403 includes preview when not following. */
export async function getGuessesByCode(
  code: string,
  { _retried = false }: { _retried?: boolean } = {}
): Promise<FriendGuessesResponse> {
  const token = localStorage.getItem("jwt");
  const res = await fetch(`${codePath(code)}/guesses`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401 && !_retried) {
    const refreshed = await tryRefreshAfterUnauthorized();
    if (refreshed) return getGuessesByCode(code, { _retried: true });
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new FriendGuessesAccessError(
      (body as { error?: string })?.error || "Failed to load guesses",
      res.status,
      (body as { user?: FriendPreview })?.user
    );
  }
  return body as FriendGuessesResponse;
}

export const connectUsers = async (inviterId: string) => {
  return apiClient('/api/users/connect', {
    method: 'POST',
    body: { inviterId },
  });
};