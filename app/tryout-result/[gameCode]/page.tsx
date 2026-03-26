"use client";

import TryoutResultContent from "./TryoutResultContent";

export default function TryoutResultPage({ params }: { params: { gameCode: string } }) {
  const { gameCode } = params;
  return <TryoutResultContent gameCode={gameCode} />;
}
