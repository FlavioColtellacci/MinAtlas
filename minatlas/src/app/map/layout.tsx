import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

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
    title: "Mining Map | MinAtlas",
    description,
    url: "/map",
    images: [
      {
        url: absoluteUrl("/globe-australia.jpg"),
        width: 1200,
        height: 630,
        alt: "MinAtlas mining map for Australia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mining Map | MinAtlas",
    description,
    images: [absoluteUrl("/globe-australia.jpg")],
  },
};

export default function MapLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
