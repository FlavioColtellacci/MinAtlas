import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_NAME } from "@/lib/site";

const description =
  "Open the MinAtlas mining map to explore Australian mine sites, tenements, operators and commodities from a map-first view.";

export const metadata: Metadata = {
  title: "Mining Map",
  description,
  alternates: {
    canonical: "/map",
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: SITE_NAME,
    title: "Interactive Australian mining map: sites & tenements | MinAtlas",
    description,
    url: "/map",
  },
  twitter: {
    card: "summary_large_image",
    title: "Interactive Australian mining map: sites & tenements | MinAtlas",
    description,
  },
};

export default function MapLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
