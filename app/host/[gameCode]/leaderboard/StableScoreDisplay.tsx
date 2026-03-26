"use client"

import React, { useState, useEffect } from "react"

interface StableScoreDisplayProps {
    score: number
    playerId: string
}

// === STABLE SCORE DISPLAY ===
export const StableScoreDisplay = React.memo(({
    score,
    playerId
}: StableScoreDisplayProps) => {
    const [displayScore, setDisplayScore] = useState(score)

    useEffect(() => {
        // Only update if score actually increased (prevents flickering to 0)
        if (score > displayScore) {
            setDisplayScore(score)
        }
    }, [score, displayScore])

    return (
        <span className="font-bold">
            {displayScore}
        </span>
    )
})
StableScoreDisplay.displayName = "StableScoreDisplay"
