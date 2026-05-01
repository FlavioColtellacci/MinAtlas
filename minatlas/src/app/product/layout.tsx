import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_NAME } from "@/lib/site";

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
    title: "Product tour — map-first Australian mining intelligence | MinAtlas",
    description,
    url: "/product",
  },
  twitter: {
    card: "summary_large_image",
    title: "Product tour — map-first Australian mining intelligence | MinAtlas",
    description,
  },
};

export default function ProductLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
