"use client";

import { use } from "react";
import TryoutResultContent from "./TryoutResultContent";

export default function TryoutResultPage({ params }: { params: Promise<{ gameCode: string }> }) {
  const { gameCode } = use(params);
  return <TryoutResultContent gameCode={gameCode} />;
}


