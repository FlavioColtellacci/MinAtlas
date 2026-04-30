import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

const description =
  "Review the official mining datasets behind MinAtlas, including WA mine sites, tenements, operating mines and public resource layers.";

export const metadata: Metadata = {
  title: "Data Sources",
  description,
  alternates: {
    canonical: "/data",
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: SITE_NAME,
    title: "Data Sources | MinAtlas",
    description,
    url: "/data",
    images: [
      {
        url: absoluteUrl("/globe-australia.jpg"),
        width: 1200,
        height: 630,
        alt: "MinAtlas official mining data sources",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Data Sources | MinAtlas",
    description,
    images: [absoluteUrl("/globe-australia.jpg")],
  },
};

export default function DataLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
