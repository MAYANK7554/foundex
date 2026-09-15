const BASE = "/api";

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

  submitClaim: (payload, token) => request("/claims", { method: "POST", body: payload, token }),
  claimsForItem: (foundItemId, token) => request(`/claims/for-item/${foundItemId}`, { token }),
  decideClaim: (id, decision, token) =>
    request(`/claims/${id}/decision`, { method: "PATCH", body: { decision }, token }),

  adminOverview: (token) => request("/admin/overview", { token }),
  adminItems: (token) => request("/admin/items", { token }),
  adminClaims: (token) => request("/admin/claims", { token }),
};
