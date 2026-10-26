import { apiRequest, jsonRequest } from "./api";

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
