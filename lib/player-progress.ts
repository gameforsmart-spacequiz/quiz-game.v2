// Utility functions for calculating player progress from responses
export interface PlayerResponse {
  player_id: string;
  question_id: string;
  answer_id: string;
  is_correct: boolean;
  points_earned: number;
  created_at: string;
}

export interface Participant {
  id: string;
  name: string;
  avatar: string;
  score: number;
  joined_at: string;
}

/**
 * Calculate how many questions a player has answered
 */
export function getPlayerProgress(playerId: string, responses: PlayerResponse[]): number {
  return responses.filter(r => r.player_id === playerId).length;
}

/**
 * Get current question number for a player (1-based)
 */
export function getCurrentQuestion(playerId: string, responses: PlayerResponse[], totalQuestions: number): number | null {
  const answered = getPlayerProgress(playerId, responses);
  return answered < totalQuestions ? answered + 1 : null;
}

/**
 * Check if player has completed all questions
 */
export function isPlayerFinished(playerId: string, responses: PlayerResponse[], totalQuestions: number): boolean {
  return getPlayerProgress(playerId, responses) >= totalQuestions;
}

/**
 * Get player statistics
 */
export function getPlayerStats(playerId: string, responses: PlayerResponse[]) {
  const playerResponses = responses.filter(r => r.player_id === playerId);
  const correctAnswers = playerResponses.filter(r => r.is_correct).length;
  const totalPoints = playerResponses.reduce((sum, r) => sum + r.points_earned, 0);
  
  return {
    totalAnswered: playerResponses.length,
    correctAnswers,
    incorrectAnswers: playerResponses.length - correctAnswers,
    totalPoints,
    accuracy: playerResponses.length > 0 ? (correctAnswers / playerResponses.length) * 100 : 0
  };
}

/**
 * Get all players' progress summary
 */
export function getAllPlayersProgress(participants: Participant[], responses: PlayerResponse[], totalQuestions: number) {
  return participants.map(participant => ({
    ...participant,
    progress: getPlayerProgress(participant.id, responses),
    currentQuestion: getCurrentQuestion(participant.id, responses, totalQuestions),
    isFinished: isPlayerFinished(participant.id, responses, totalQuestions),
    stats: getPlayerStats(participant.id, responses)
  }));
}
