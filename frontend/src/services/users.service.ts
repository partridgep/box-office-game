import { apiClient } from "./apiClient";
import { GuessUser } from "../types";

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

export interface FollowedUser {
  name: string;
  short_id: string;
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
  (await apiClient<{ following: FollowedUser[] }>("/api/users/me/following")).following;

export const connectUsers = async (inviterId: string) => {
  return apiClient('/api/users/connect', {
    method: 'POST',
    body: { inviterId },
  });
};