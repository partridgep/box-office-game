import { encryptText, saveEncrypted } from "./crypto/cryptoStorage";

export interface PersistableUser {
  id: string;
  short_id: string;
  name: string;
  access_key?: string;
}

export async function persistUser(user: PersistableUser) {
  localStorage.setItem("user", JSON.stringify(user));

  if (user.access_key) {
    await saveEncrypted("access_key", await encryptText(user.access_key));
  }
}