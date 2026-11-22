const BASE = "/api";

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // A 401 on an authenticated request means the session expired or was revoked.
    if (res.status === 401 && token && onUnauthorized) onUnauthorized();
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),

  meta: (token) => request("/items/meta", { token }),
  createItem: (payload, token) => request("/items", { method: "POST", body: payload, token }),
  listItems: (query, token) => request(`/items?${new URLSearchParams(query)}`, { token }),
  myItems: (token) => request("/items/mine", { token }),
  getItem: (id, token) => request(`/items/${id}`, { token }),
  setItemStatus: (id, status, token) =>
    request(`/items/${id}/status`, { method: "PATCH", body: { status }, token }),
  deleteItem: (id, token) => request(`/items/${id}`, { method: "DELETE", token }),

  submitClaim: (payload, token) => request("/claims", { method: "POST", body: payload, token }),
  myClaims: (token) => request("/claims/mine", { token }),
  claimsForItem: (foundItemId, token) => request(`/claims/for-item/${foundItemId}`, { token }),
  decideClaim: (id, decision, token) =>
    request(`/claims/${id}/decision`, { method: "PATCH", body: { decision }, token }),
};
