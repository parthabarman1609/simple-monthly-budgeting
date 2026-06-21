import { supabase } from "./supabaseClient";

const BASE_URL = "https://obscure-space-orbit-x5jg5w6g9gvp3p4rw-8002.app.github.dev/api/v1";

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

  return res.json();
}

export async function apiGet(path) {
  const headers = {};
  
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { headers });
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
  return res.json();
}