import { apiPublic } from "@/api";

export async function saveQuoteShare(payload) {
  const { data } = await apiPublic.post("/quotes/share", payload, {
    timeout: 45000,
  });
  return data;
}

export async function fetchQuoteShare(id) {
  const { data } = await apiPublic.get(`/quotes/share/${id}`);
  return data;
}
