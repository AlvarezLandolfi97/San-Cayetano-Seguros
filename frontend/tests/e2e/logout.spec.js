import { test, expect } from "@playwright/test";

const USER_PROFILE = {
  id: 1,
  email: "e2e@seguros.local",
  first_name: "E2E",
  last_name: "Tester",
  is_admin: false,
};

const STORAGE_KEYS = {
  access: "sc_access",
  refresh: "sc_refresh",
  user: "sc_user",
};

async function seedStorage(page, { access, refresh, user }) {
  await page.addInitScript((payload) => {
    window.localStorage.setItem("sc_access", JSON.stringify(payload.access));
    if (payload.refresh) {
      window.localStorage.setItem("sc_refresh", JSON.stringify(payload.refresh));
    } else {
      window.localStorage.removeItem("sc_refresh");
    }
    window.localStorage.setItem("sc_user", JSON.stringify(payload.user));
  }, { access, refresh, user });
}

async function interceptProfile(page) {
  await page.route("**/api/accounts/users/me", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(USER_PROFILE),
    });
  });
}

test.describe("Logout experience", () => {
  test("includes refresh token in request, clears storage and redirects", async ({ page }) => {
    await interceptProfile(page);

    const auth = {
      access: "access-token",
      refresh: "refresh-token",
      user: USER_PROFILE,
    };

    let logoutRequest = null;
    await page.route("**/api/auth/logout/", async (route, request) => {
      logoutRequest = request;
      expect(request.postDataJSON()).toEqual({ refresh: auth.refresh });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      });
    });

    await seedStorage(page, auth);
    await page.goto("/dashboard/perfil");
    await page.click('[data-testid="logout-button"]');

    await expect(page).toHaveURL(/\/login$/);
    expect(logoutRequest).not.toBeNull();
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEYS.access)).toBeNull();
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEYS.refresh)).toBeNull();
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEYS.user)).toBeNull();
  });

  test("skips logout request when refresh token is missing but still clears storage", async ({ page }) => {
    await interceptProfile(page);

    const auth = {
      access: "access-token",
      refresh: null,
      user: USER_PROFILE,
    };

    let logoutRequestSeen = false;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/auth/logout/")) {
        logoutRequestSeen = true;
      }
    });

    await seedStorage(page, auth);
    await page.goto("/dashboard/perfil");
    await page.click('[data-testid="logout-button"]');

    await expect(page).toHaveURL(/\/login$/);
    expect(logoutRequestSeen).toBe(false);
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEYS.access)).toBeNull();
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEYS.refresh)).toBeNull();
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEYS.user)).toBeNull();
  });
});
