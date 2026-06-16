import { Suspense } from "react";
import AnfrageClient from "./AnfrageClient";

export default function AnfragePage() {
  return (
    <main className="min-h-screen bg-stone-50 py-12 px-4">
      <Suspense
        fallback={
          <p className="text-center text-stone-400">Wird geladen…</p>
        }
      >
        <AnfrageClient />
      </Suspense>
    </main>
  );
}
