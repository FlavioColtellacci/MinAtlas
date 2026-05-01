import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_NAME } from "@/lib/site";

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
    title: "Mining datasets — WA mines, tenements & public layers | MinAtlas",
    description,
    url: "/data",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mining datasets — WA mines, tenements & public layers | MinAtlas",
    description,
  },
};

export default function DataLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
