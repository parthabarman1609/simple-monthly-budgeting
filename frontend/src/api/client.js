import { supabase } from "./supabaseClient";

const API_VERSION_PATH = "/api/v1";
const configuredBaseUrl = (process.env.REACT_APP_API_BASE_URL || "https://obscure-space-orbit-x5jg5w6g9gvp3p4rw-8002.app.github.dev/api/v1").replace(/\/+$/, "");
const BASE_URL = configuredBaseUrl.endsWith(API_VERSION_PATH)
  ? configuredBaseUrl
  : `${configuredBaseUrl}${API_VERSION_PATH}`;

export async function apiPost(path, body, isMultipart = false) {
  const headers = {};
  
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }

  // Get current session and attach the JWT token
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: isMultipart ? body : JSON.stringify(body)
  });

  // THE FIX: Explicitly throw an error if the status code is not 2xx
  if (!res.ok) {
    const errorData = await res.json();
    throw errorData; // This jumps straight to the catch() block in AddExpense.js
  }

  return res.json();
}

export async function apiGet(path) {
  const headers = {};
  
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { headers });

  // THE FIX: Explicitly throw an error if the status code is not 2xx
  if (!res.ok) {
    const errorData = await res.json();
    throw errorData; // This jumps straight to the catch() block in AddExpense.js
  }
  return res.json();
}

export async function apiPut(path, body, isMultipart = false) {
  const headers = {};
  
  // If it's NOT a file upload, set the JSON content type.
  // If it IS a file upload, let the browser automatically set the multipart boundary headers.
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers,
    body: isMultipart ? body : JSON.stringify(body)
  });

  // THE FIX: Explicitly throw an error if the status code is not 2xx
  if (!res.ok) {
    const errorData = await res.json();
    throw errorData; // This jumps straight to the catch() block in AddExpense.js
  }

  return res.json();
}

export async function apiDelete(path) {
  const headers = {};
  
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers
  });

  // THE FIX: Explicitly throw an error if the status code is not 2xx
  if (!res.ok) {
    const errorData = await res.json();
    throw errorData; // This jumps straight to the catch() block in AddExpense.js
  }

  return res.json();
}

export async function apiPatch(path, body) {
  const headers = { "Content-Type": "application/json" };
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body)
  });

  // THE FIX: Explicitly throw an error if the status code is not 2xx
  if (!res.ok) {
    const errorData = await res.json();
    throw errorData; // This jumps straight to the catch() block in AddExpense.js
  }
  
  return res.json();
}
