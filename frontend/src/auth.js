import { setAuth as setApiAuth, clearAuth as clearApiAuth, getAuthUser as getApiUser } from "./api";

export function setAuth(payload) {
  return setApiAuth(payload);
}

export function clearAuth() {
  return clearApiAuth();
}

export function getAuthUser() {
  return getApiUser();
}
