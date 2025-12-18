"use client";
import { Suspense } from "react";
import HostContent from "./HostContent";

export const dynamic = "force-dynamic";

export default function HostPage({ params }: { params: { gameCode: string } }) {
  const { gameCode } = params;
  return (
    <Suspense fallback={<p>Loading host dashboard…</p>}>
      <HostContent gameCode={gameCode} />
    </Suspense>
  );
}