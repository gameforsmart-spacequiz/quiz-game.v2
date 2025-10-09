// lib/dummy-data.ts

import type { Quiz } from "./types"
import { supabase } from "./supabase"

// Export AVATAR_OPTIONS
export { AVATAR_OPTIONS } from "./types"

// Fetch function - no more dummy fallback, will throw error if database fails
export async function fetchQuizzes(): Promise<Quiz[]> {
  const { data: quizzes, error: quizzesError } = await supabase
    .from("quizzes")
    .select("*")
    .eq("language", "id")

  if (quizzesError) {
    console.error("Error fetching quizzes:", quizzesError)
    throw new Error(`Database error: ${quizzesError.message}`)
  }

  if (!quizzes || quizzes.length === 0) {
    throw new Error("No quizzes found in database")
  }

  // The questions are already stored as JSONB in the quizzes table
  return quizzes.map(quiz => ({
    ...quiz,
    questions: quiz.questions || []
  }))
}
