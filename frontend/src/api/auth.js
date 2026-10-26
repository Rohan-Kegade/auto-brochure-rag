import { apiRequest, jsonRequest } from "./client";

export const loginApi = ({ email, password }) =>
  apiRequest("/auth/login", {
    ...jsonRequest("POST", { email, password }),
    auth: false,
    fallbackError: "Couldn't log you in.",
  });

export const signupApi = ({ name, email, password }) =>
  apiRequest("/auth/signup", {
    ...jsonRequest("POST", { name, email, password }),
    auth: false,
    fallbackError: "Couldn't create your account.",
  });

export const fetchMeApi = () =>
  apiRequest("/auth/me", { retry: true, fallbackError: "Couldn't load your account." });

export const logoutApi = () =>
  apiRequest("/auth/logout", { method: "POST", fallbackError: "Couldn't log you out." });

export const updateProfileApi = ({ name }) =>
  apiRequest("/auth/me", {
    ...jsonRequest("PATCH", { name }),
    fallbackError: "Couldn't update your profile.",
  });

/** Logs out every other session; this one stays logged in. */
export const changePasswordApi = ({ currentPassword, newPassword }) =>
  apiRequest("/auth/password", {
    ...jsonRequest("POST", { current_password: currentPassword, new_password: newPassword }),
    fallbackError: "Couldn't change your password.",
  });

export const deleteAccountApi = ({ password }) =>
  apiRequest("/auth/me", {
    ...jsonRequest("DELETE", { password }),
    fallbackError: "Couldn't delete your account.",
  });
