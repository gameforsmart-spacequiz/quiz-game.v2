"use client";

import TryoutPlayContent from "@/app/tryout-play/[gameCode]/TryoutPlayContent";

export default function TryoutPlayPage({ params }: { params: { gameCode: string } }) {
  const { gameCode } = params;
  return <TryoutPlayContent gameCode={gameCode} />;
}
