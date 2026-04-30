import type { Metadata } from "next";
import Script from "next/script";
import QueryProvider from "@/components/providers/QueryProvider";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";
import "./globals.css";

const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: "en-AU",
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      description:
        "MinAtlas makes Australian mining and resources data easier to explore through a map-first public atlas.",
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MinAtlas | Australian Mining Map",
    template: "%s | MinAtlas",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "MinAtlas | Australian Mining Map",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: absoluteUrl("/globe-australia.jpg"),
        width: 1200,
        height: 630,
        alt: "MinAtlas map-first mining intelligence for Australia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MinAtlas | Australian Mining Map",
    description: SITE_DESCRIPTION,
    images: [absoluteUrl("/globe-australia.jpg")],
  },
  other: {
    "google-adsense-account": "ca-pub-6113308150656934",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <QueryProvider>{children}</QueryProvider>
      </body>
      {gaId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}
          </Script>
        </>
      ) : null}
    </html>
  );
}
