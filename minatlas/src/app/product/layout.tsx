import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

const description =
  "Explore how MinAtlas turns official Australian mining data into a fast, map-first product for mine sites, tenements, operators and commodities.";

export const metadata: Metadata = {
  title: "Product",
  description,
  alternates: {
    canonical: "/product",
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: SITE_NAME,
    title: "Product | MinAtlas",
    description,
    url: "/product",
    images: [
      {
        url: absoluteUrl("/globe-australia.jpg"),
        width: 1200,
        height: 630,
        alt: "MinAtlas product for Australian mining intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Product | MinAtlas",
    description,
    images: [absoluteUrl("/globe-australia.jpg")],
  },
};

export default function ProductLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
