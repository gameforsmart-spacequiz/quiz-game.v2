"use client";

import { use } from "react";
import TryoutPlayContent from "@/app/tryout-play/[gameCode]/TryoutPlayContent";

export default function TryoutPlayPage({ params }: { params: Promise<{ gameCode: string }> }) {
  const { gameCode } = use(params);
  return <TryoutPlayContent gameCode={gameCode} />;
}
