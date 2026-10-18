export const siteName = "Pamoja";
export const siteTitle = "Pamoja — Together, for less.";
export const siteDescription =
  "A little each. A lot together. Pool your community’s demand, unlock wholesale prices and collect everyday essentials with Pamoja.";

const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const siteUrl = new URL(configuredUrl).origin;

export const privatePaths = [
  "/api/",
  "/join/",
  "/pass/",
  "/pools",
  "/members",
  "/payments",
  "/orders",
  "/pickups",
  "/suppliers",
  "/supplier",
  "/settings",
];
