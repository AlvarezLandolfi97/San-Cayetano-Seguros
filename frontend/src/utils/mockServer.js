// src/utils/mockServer.js
import { api } from "@/api";

export function setupMocks() {
  api.interceptors.request.use(async (config) => {
    // interceptar GET /policies/my
    if (config.url === "/policies/my") {
      return Promise.resolve({
        ...config,
        adapter: async () => ({
          data: [
            { id: 1, product: "Auto Full", plate: "ABC123" },
            { id: 2, product: "Terceros", plate: "XYZ789" },
          ],
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        }),
      });
    }

    // interceptar GET /products/types
    if (config.url === "/products/types" && config.method?.toLowerCase() === "get") {
      return Promise.resolve({
        ...config,
        adapter: async () => ({
          data: [
            {
              code: "PLAN_A",
              name: "Responsabilidad Civil (RC)",
              subtitle: "Cobertura básica obligatoria",
              features: [
                "Daños a terceros",
                "Cobertura legal básica"
              ],
            },
            {
              code: "PLAN_B",
              name: "Terceros Completo",
              subtitle: "Equilibrio entre costo y cobertura",
              features: [
                "Daños a terceros",
                "Robo total",
                "Incendio total",
                "Granizo hasta $X"
              ],
            },
            {
              code: "PLAN_C",
              name: "Todo Riesgo",
              subtitle: "Protección total del vehículo",
              features: [
                "Daños propios",
                "Cristales, cerraduras",
                "Granizo sin tope",
                "Auxilio premium"
              ],
            },
            {
              code: "PLAN_D",
              name: "Auto Total",
              subtitle: "Suma fija ante destrucción total",
              features: [
                "DT por accidente",
                "DT por incendio/robo",
                "Remolque"
              ],
            },
          ],
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        }),
      });
    }

    // interceptar otros endpoints similares
    return config;
  });
}
