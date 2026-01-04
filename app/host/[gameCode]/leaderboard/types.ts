// === LEADERBOARD TYPES ===
export interface PlayerProgress {
    id: string
    name: string
    avatar: string
    score: number
    currentQuestion: number
    totalQuestions: number
    isActive: boolean
    rank: number
}

export interface PodiumLeaderboardProps {
    players: PlayerProgress[]
    onAnimationComplete: () => void
    onRestart?: () => void
    onHome?: () => void
}
