import { Suspense } from "react";
import HomeClient from "./home-client";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="text-center py-16">Wird geladen…</div>}>
      <HomeClient />
    </Suspense>
  );
}
