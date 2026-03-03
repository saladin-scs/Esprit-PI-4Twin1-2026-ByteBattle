import API from "./api";

export const register = (userData) =>
  API.post("/auth/register", userData);

export const login = (userData) =>
  API.post("/auth/login", userData);

export const getMe = () =>
  API.get("/auth/me");