export interface Player {
  id: string
  name: string
  avatar: string
  score: number
  current_question: number
  joined_at?: string // When player joined
}

export interface Quiz {
  id: string
  title: string
  description?: string
  category?: string
  language: string
  image_url?: string
  cover_image?: string
  is_public: boolean
  creator_id: string
  questions: Question[]
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  question: string // Teks pertanyaan
  type: string // Tipe pertanyaan (misal: 'multiple_choice')
  image?: string | null // URL gambar pertanyaan
  points: number
  answers: Answer[]
  correct: string // ID of correct answer
}

export interface Answer {
  id: string
  answer: string
  image?: string | null // URL gambar pilihan jawaban
}

export interface GameSettings {
  timeLimit: number
  questionCount: number
}

export interface Game {
  id: string
  quiz_id: string
  host_id: string
  game_pin: string
  status: "waiting" | "active" | "finished"
  total_time_minutes: number
  question_limit: string
  game_end_mode: string
  allow_join_after_start: boolean
  participants: Player[]
  responses: any[]
  chat_messages: any[]
  created_at: string
  countdown_started_at?: string
  started_at?: string
  ended_at?: string
  current_questions: Question[]
  application: string
}

export interface PlayerAnswer {
  id: string
  answer_id: string
  question_id: string
  is_correct: boolean
  points_earned: number
  created_at: string
  answered_at?: string // When answer was submitted
}

export interface AVATAR_OPTION {
  id: string
  name: string
  image: string
}

// Avatar options untuk join game
export const AVATAR_OPTIONS: AVATAR_OPTION[] = [
  { id: "bear", name: "Bear", image: "/avatars/bear.png" },
  { id: "cat", name: "Cat", image: "/avatars/cat.png" },
  { id: "dog", name: "Dog", image: "/avatars/dog.png" },
  { id: "elephant", name: "Elephant", image: "/avatars/elephant.png" },
  { id: "lion", name: "Lion", image: "/avatars/lion.png" },
  { id: "panda", name: "Panda", image: "/avatars/panda.png" },
  { id: "rabbit", name: "Rabbit", image: "/avatars/rabbit.png" },
  { id: "tiger", name: "Tiger", image: "/avatars/tiger.png" },
]
