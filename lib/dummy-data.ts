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
    .eq("difficulty_level", "TK")

  if (quizzesError) {
    console.error("Error fetching quizzes:", quizzesError)
    throw new Error(`Database error: ${quizzesError.message}`)
  }

  if (!quizzes || quizzes.length === 0) {
    throw new Error("No quizzes found in database")
  }

  const quizzesWithQuestions = await Promise.all(
    quizzes.map(async (quiz) => {
      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select(
          `
          id,
          question,
          type,
          order_index,
          question_image_url,
          question_image_alt,
          choices (
            id,
            choice_text,
            is_correct,
            order_index,
            choice_image_url,
            choice_image_alt
          )
        `,
        )
        .eq("quiz_id", quiz.id)
        .order("order_index")

      if (questionsError) {
        console.error("Error fetching questions for quiz", quiz.id, ":", questionsError)
        throw new Error(`Failed to fetch questions for quiz ${quiz.title}: ${questionsError.message}`)
      }

      return {
        ...quiz,
        questions: questions.map((q) => ({
          id: q.id,
          question: q.question,
          type: q.type,
          order_index: q.order_index,
          question_image_url: q.question_image_url,
          question_image_alt: q.question_image_alt,
          choices: q.choices || [],
        })),
      }
    }),
  )

  return quizzesWithQuestions
}
