import { api } from "@/api";

export async function saveQuoteShare(payload) {
  const { data } = await api.post("/quotes/share", payload, { timeout: 45000 });
  return data;
}

export async function fetchQuoteShare(id) {
  const { data } = await api.get(`/quotes/share/${id}`);
  return data;
}
