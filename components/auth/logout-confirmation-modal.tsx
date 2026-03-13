"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LogOut, X, Rocket, Sparkles } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

interface LogoutConfirmationModalProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function LogoutConfirmationModal({
  open,
  onConfirm,
  onCancel
}: LogoutConfirmationModalProps) {
  const { t } = useLanguage()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleConfirm = async () => {
    setIsLoggingOut(true)
    try {
      await onConfirm()
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-sm sm:max-w-md p-0 border-0 bg-transparent">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative"
            >
              {/* Main Card */}
              <div className="relative bg-gradient-to-br from-[#1a1a2e]/95 via-[#16213e]/95 to-[#0f0f23]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-purple-900/30">

                {/* Floating stars background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: [0, 0.8, 0],
                        scale: [0.5, 1.2, 0.5],
                      }}
                      transition={{
                        duration: Math.random() * 2 + 2,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                      }}
                      className="absolute w-1 h-1 bg-white rounded-full"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                      }}
                    />
                  ))}
                </div>

                {/* Gradient overlay lines */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />
                </div>

                {/* Content */}
                <div className="relative z-10 p-6 sm:p-8">
                  {/* Close button */}
                  <button
                    onClick={onCancel}
                    className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">{t('close', 'Close')}</span>
                  </button>

                  <DialogHeader className="mb-6">
                    {/* Cosmic Icon with orbital rings */}
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                      className="mb-5 flex justify-center"
                    >
                      <div className="relative w-20 h-20">
                        {/* Outer ring */}
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 rounded-full border border-red-500/30"
                        >
                          <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-red-400 rounded-full shadow-lg shadow-red-400/50" />
                        </motion.div>

                        {/* Middle ring */}
                        <motion.div
                          animate={{ rotate: -360 }}
                          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-2 rounded-full border border-orange-500/40"
                        >
                          <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50" />
                        </motion.div>

                        {/* Center icon */}
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-4 rounded-full bg-gradient-to-br from-red-500 to-orange-600 shadow-xl shadow-orange-500/40 flex items-center justify-center"
                        >
                          <LogOut className="w-6 h-6 text-white" />
                        </motion.div>
                      </div>
                    </motion.div>

                    <DialogTitle className="text-xl sm:text-2xl font-bold text-center">
                      <span className="bg-gradient-to-r from-red-300 via-orange-300 to-yellow-300 bg-clip-text text-transparent">
                        {t('confirmLogout', 'Confirm Logout')}
                      </span>
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6">
                    {/* Warning Message */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-center px-2"
                    >
                      <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                        {t('logoutWarning', 'Are you sure you want to logout?')}
                      </p>
                    </motion.div>

                    {/* Action Buttons */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex flex-col sm:flex-row gap-3"
                    >
                      {/* Cancel Button */}
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1"
                      >
                        <Button
                          onClick={onCancel}
                          variant="outline"
                          className="w-full h-11 sm:h-12 bg-white/5 backdrop-blur-lg border-white/20 text-white hover:bg-white/15 hover:border-white/30 transition-all duration-300 rounded-xl font-medium"
                          disabled={isLoggingOut}
                        >
                          <Sparkles className="w-4 h-4 mr-2 text-cyan-400" />
                          {t('cancel', 'Cancel')}
                        </Button>
                      </motion.div>

                      {/* Logout Button */}
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1"
                      >
                        <Button
                          onClick={handleConfirm}
                          disabled={isLoggingOut}
                          className="w-full h-11 sm:h-12 bg-gradient-to-r from-red-600 via-orange-600 to-red-600 hover:from-red-500 hover:via-orange-500 hover:to-red-500 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 disabled:opacity-50 flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden group"
                        >
                          {/* Shimmer effect */}
                          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                          {isLoggingOut ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="relative"
                              >
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                              </motion.div>
                              <motion.span
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              >
                                {t('loggingOut', 'Logging out...')}
                              </motion.span>
                            </>
                          ) : (
                            <>
                              <Rocket className="w-4 h-4 group-hover:-rotate-45 transition-transform duration-300" />
                              <span className="relative z-10">{t('logout', 'Logout')}</span>
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}