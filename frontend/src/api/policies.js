import { api } from "@/api";

export async function claimPolicy(code) {
  const { data } = await api.post("/policies/claim", { code });
  return data;
}
