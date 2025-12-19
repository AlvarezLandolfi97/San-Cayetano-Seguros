import { api } from "@/api";

export async function claimPolicy(number) {
  const { data } = await api.post("/policies/claim", { number });
  return data;
}
