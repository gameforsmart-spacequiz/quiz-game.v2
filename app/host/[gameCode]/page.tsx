"use client";
import HostContent from "./HostContent";

export const dynamic = "force-dynamic";

export default function HostPage({ params }: { params: { gameCode: string } }) {
  const { gameCode } = params;
  return (
    <HostContent gameCode={gameCode} />
  );
}