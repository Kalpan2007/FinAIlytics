import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { RootState } from "./store";

const env = (import.meta as any).env || {};
let API_BASE: string = env.VITE_API_URL || env.VITE_API_BASE_URL || "";
// Ensure BASE_PATH (/api) is present once
if (API_BASE) {
  API_BASE = API_BASE.replace(/\/$/, "");
  if (!/\/api\/?$/.test(API_BASE)) {
    API_BASE = `${API_BASE}/api`;
  }
}
// Final fallback for local development
if (!API_BASE) {
  API_BASE = "http://localhost:8000/api";
}

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const auth = (getState() as RootState).auth;
    if (auth?.accessToken) {
      headers.set("Authorization", `Bearer ${auth.accessToken}`);
    }
    return headers;
  },
});

export const apiClient = createApi({
  reducerPath: "api", // Add API client reducer to root reducer
  baseQuery: baseQuery,
  refetchOnMountOrArgChange: true, // Refetch on mount or arg change
  tagTypes: ["transactions", "analytics", "billingSubscription", "reports"], // Tag types for RTK Query
  endpoints: () => ({}), // Endpoints for RTK Query
});
