"use client";

import WaitContent from "./WaitContent";

export default function WaitPage({ params }: { params: { gameCode: string } }) {
  const { gameCode } = params;
  return <WaitContent gameCode={gameCode} />;
}