const BASE_URL = "https://obscure-space-orbit-x5jg5w6g9gvp3p4rw-8002.app.github.dev/api/v1";

export async function apiPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return res.json();
}

export async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  return res.json();
}