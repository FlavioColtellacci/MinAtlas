export const SITE_NAME = "MinAtlas";

export const SITE_URL = "https://minatlas.app";

export const SITE_DESCRIPTION =
  "Map-first intelligence for Australia's mining sector. Explore mine sites, tenements, operators and commodities with clarity.";

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}
