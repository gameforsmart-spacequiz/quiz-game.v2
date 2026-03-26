"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image, { type StaticImageData } from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/language-context"
import { Sparkles, Star, Gamepad2, Rocket, Zap, Target, X, ChevronRight, ChevronLeft } from "lucide-react"

interface TutorialModalProps {
  open: boolean
  onClose: (closedByX?: boolean) => void
  onConfirm: () => void
}

export function TutorialModal({ open, onClose, onConfirm }: TutorialModalProps) {
  const { t } = useLanguage()
  const [step, setStep] = useState(1)

  const nextStep = () => setStep((prev) => prev + 1)
  const prevStep = () => setStep((prev) => prev - 1)

  const handleFinish = () => {

    setStep(1)
    onConfirm()
  }

  const handleClose = () => {

    setStep(1)
    onClose(true) // Pass true to indicate it was closed by X button
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {

      onClose(false) // Pass false to indicate normal close
    }
  }

  const stepVariants = {
    hidden: { opacity: 0, x: 20, scale: 0.95 },
    visible: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -20, scale: 0.95 },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.3 }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-[92vw] xs:max-w-sm sm:max-w-md p-0 border-0 bg-transparent mx-auto">
        {/* Glass morphism dialog content */}
        <div className="relative z-10 bg-gradient-to-br from-slate-900/95 via-indigo-950/95 to-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl xs:rounded-3xl p-4 xs:p-5 sm:p-6 shadow-2xl overflow-hidden">

          {/* Animated background effects */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl xs:rounded-3xl">
            {/* Nebula gradients */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-cyan-600/10"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-pink-600/5 via-transparent to-blue-600/5"></div>

            {/* Floating stars */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${15 + (i * 18)}%`,
                  top: `${10 + (i * 15) % 80}%`,
                }}
                animate={{
                  opacity: [0.2, 0.7, 0.2],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 2 + (i * 0.3),
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            ))}
          </div>

          {/* Close button */}
          <motion.button
            onClick={handleClose}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="absolute right-3 top-3 xs:right-4 xs:top-4 w-7 h-7 xs:w-8 xs:h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all duration-200 z-20"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">{t('close', 'Close')}</span>
          </motion.button>

          <DialogHeader className="mb-3 xs:mb-4 relative z-10">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
              className="mb-2 xs:mb-3 flex justify-center"
            >
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 rounded-xl blur-sm opacity-60"></div>
                <div className="relative w-11 h-11 xs:w-12 xs:h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center border border-white/30 shadow-lg">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Gamepad2 className="w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7 text-white" />
                  </motion.div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <DialogTitle className="text-lg xs:text-xl sm:text-2xl font-bold text-center text-white drop-shadow-lg">
                {t('howToPlay', 'How to Play')}
              </DialogTitle>
            </motion.div>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {/* Step 1 */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={stepVariants}
                transition={{ duration: 0.3 }}
                className="space-y-3 xs:space-y-4 relative z-10"
              >
                <div className="space-y-2.5 xs:space-y-3">
                  {[
                    { num: 1, color: "from-cyan-400 to-blue-500", shadow: "shadow-cyan-400/30", text: t('enterName', 'Enter your name and choose an avatar.') },
                    { num: 2, color: "from-purple-400 to-pink-500", shadow: "shadow-purple-400/30", text: t('gameCodeQR', 'Enter the 6-digit game code or scan the QR code.') },
                    { num: 3, color: "from-green-400 to-emerald-500", shadow: "shadow-green-400/30", text: t('waitForHost', 'Wait for the host to start the quiz.') }
                  ].map((item, i) => (
                    <motion.div
                      key={item.num}
                      custom={i}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      className="flex items-start gap-3"
                    >
                      <motion.div
                        className={`w-6 h-6 xs:w-7 xs:h-7 bg-gradient-to-br ${item.color} rounded-full flex items-center justify-center text-xs xs:text-sm font-bold text-white shadow-lg ${item.shadow} flex-shrink-0`}
                        whileHover={{ scale: 1.1 }}
                      >
                        {item.num}
                      </motion.div>
                      <p className="flex-1 text-white/90 text-sm xs:text-base leading-relaxed">{item.text}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={stepVariants}
                transition={{ duration: 0.3 }}
                className="space-y-3 xs:space-y-4 relative z-10"
              >
                <motion.div
                  className="flex items-center gap-2 mb-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <Rocket className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white text-sm xs:text-base">{t('miniGameGuide', 'Mini-Game Guide')}</h3>
                </motion.div>

                <motion.p
                  className="text-white/80 text-xs xs:text-sm leading-relaxed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {t('afterCorrect', 'After every')} <strong className="text-yellow-300">3 {t('correctAnswers', 'correct answers')}</strong>, {t('enterMiniGame', 'you\'ll enter a mini-game!')}
                </motion.p>

                <motion.div
                  className="flex justify-center py-2"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl blur-sm opacity-40"></div>
                    <Image
                      src="/images/gambar-tutor.png"
                      alt="Rocket mini-game"
                      width={140}
                      height={70}
                      className="relative rounded-lg border border-white/20 shadow-lg"
                    />
                  </div>
                </motion.div>

                <ul className="space-y-2">
                  {[
                    { icon: Zap, color: "text-yellow-400", text: t('swipeRocket', 'Swipe left/right to move the rocket.') },
                    { icon: Target, color: "text-red-400", text: t('avoidMeteors', 'Avoid meteors/dark object — hitting them will reduce your points.') },
                    { icon: Sparkles, color: "text-green-400", text: t('collectItems', 'Collect colorful items to increase your points.') }
                  ].map((item, i) => (
                    <motion.li
                      key={i}
                      className="flex items-start gap-2"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + (i * 0.1) }}
                    >
                      <item.icon className={`h-4 w-4 ${item.color} mt-0.5 flex-shrink-0`} />
                      <span className="text-white/80 text-xs xs:text-sm leading-relaxed">{item.text}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step indicator */}
          <div className="flex justify-center gap-2 mt-4 relative z-10">
            {[1, 2].map((s) => (
              <motion.div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-6 bg-gradient-to-r from-cyan-400 to-purple-400' : 'w-1.5 bg-white/30'
                  }`}
                whileHover={{ scale: 1.2 }}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-4 xs:mt-5 relative z-10 gap-2">
            {step > 1 ? (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  onClick={prevStep}
                  size="sm"
                  className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/40 backdrop-blur-sm text-xs xs:text-sm px-3 xs:px-4 h-9 xs:h-10 rounded-xl transition-all duration-200"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  {t('previous', 'Back')}
                </Button>
              </motion.div>
            ) : (
              <div></div>
            )}

            <div className="flex gap-2">
              {step < 2 && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    onClick={handleFinish}
                    size="sm"
                    className="bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:text-white backdrop-blur-sm text-xs xs:text-sm px-3 xs:px-4 h-9 xs:h-10 rounded-xl transition-all duration-200"
                  >
                    {t('skip', 'Skip')}
                  </Button>
                </motion.div>
              )}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                {step < 2 ? (
                  <Button
                    onClick={nextStep}
                    size="sm"
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/30 border-0 text-xs xs:text-sm px-4 xs:px-5 h-9 xs:h-10 rounded-xl transition-all duration-200"
                  >
                    {t('next', 'Next')}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleFinish}
                    size="sm"
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-semibold shadow-lg shadow-green-500/30 border-0 text-xs xs:text-sm px-4 xs:px-5 h-9 xs:h-10 rounded-xl transition-all duration-200"
                  >
                    <Rocket className="w-4 h-4 mr-1.5" />
                    {t('start', 'Start')}
                  </Button>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}