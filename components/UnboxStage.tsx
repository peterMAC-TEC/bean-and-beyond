"use client";

import dynamic from "next/dynamic";

// three.js only loads on this page, in the browser (WebGL can't render on the server)
const Unboxing3D = dynamic(() => import("./Unboxing3D"), {
  ssr: false,
  loading: () => (
    <main className="grid h-[100svh] place-items-center bg-ink">
      <p className="mono text-muted">Wrapping your box…</p>
    </main>
  ),
});

export function UnboxStage() {
  return <Unboxing3D />;
}
