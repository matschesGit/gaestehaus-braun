import { Suspense } from "react";
import AnfrageClient from "./AnfrageClient";

export default function AnfragePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f4efe7] to-[#e8dcc8] py-12 px-4">
      <Suspense
        fallback={
          <p className="text-center text-[#9d8c7f]">Wird geladen…</p>
        }
      >
        <AnfrageClient />
      </Suspense>
    </main>
  );
}
