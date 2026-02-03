"use client";

import PlayContent from "./PlayContent";

export default function PlayPage({ params }: { params: { gameCode: string } }) {
  const { gameCode } = params;
  return <PlayContent gameCode={gameCode} />;
}



// ikan