import { Suspense } from "react";
import MapPageClient from "./MapPageClient";

function MapLoadingFallback() {
  return (
    <main className="relative flex h-[100dvh] min-h-0 w-full max-w-[100vw] items-center justify-center overflow-x-hidden bg-map">
      <p className="text-sm text-[color:var(--text-secondary)]">Loading map…</p>
    </main>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<MapLoadingFallback />}>
      <MapPageClient />
    </Suspense>
  );
}
