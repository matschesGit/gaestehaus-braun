import { Suspense } from "react";
import HomeClient from "./home-client";

export default function HomePage() {
  return (
    <main className="flex-1">
      <Suspense fallback={<div className="text-center py-16">Wird geladen…</div>}>
        <HomeClient />
      </Suspense>
    </main>
  );
}
