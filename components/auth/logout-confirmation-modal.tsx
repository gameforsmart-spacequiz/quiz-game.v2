"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LogOut, AlertTriangle, X } from "lucide-react"
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
      <DialogContent className="max-w-md p-0 border-0 bg-transparent">
        {/* Space Background */}
        <div className="fixed inset-0 z-0 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)"
            }}
          />
          
          {/* Subtle animated elements - only on desktop */}
          <div className="absolute inset-0 flex items-center justify-center hidden md:block">
            <div className="absolute orbit-inner">
              <div className="w-1 h-1 bg-gradient-to-br from-orange-400 to-red-500 rounded-full shadow-lg shadow-orange-400/40 border border-orange-300/20">
                <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/10"></div>
              </div>
            </div>
            <div className="absolute orbit-middle">
              <div className="w-2 h-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full shadow-lg shadow-blue-400/50 border border-blue-300/30 relative">
                <div className="w-full h-full rounded-full bg-gradient-to-tl from-transparent to-white/15"></div>
              </div>
            </div>
          </div>

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/50"></div>
        </div>

        {/* Modal Content */}
        <div className="relative z-10 bg-black/30 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
          <button
            onClick={onCancel}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 disabled:pointer-events-none text-white hover:text-cyan-300"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">{t('close', 'Close')}</span>
          </button>

          <DialogHeader className="mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="mb-4 flex justify-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-red-500/30 to-orange-500/30 backdrop-blur-xl rounded-2xl flex items-center justify-center border-2 border-red-400/40 shadow-lg shadow-red-500/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-400/10 to-orange-400/10 animate-pulse"></div>
                <LogOut className="w-8 h-8 text-white relative z-10" />
                <AlertTriangle className="absolute top-1 right-1 w-3 h-3 text-orange-300 animate-pulse" />
              </div>
            </motion.div>
            
            <DialogTitle 
              className="text-2xl font-bold text-center text-transparent bg-gradient-to-r from-red-300 via-orange-300 to-yellow-300 bg-clip-text"
              style={{
                textShadow: "0 0 20px rgba(252, 165, 165, 0.5), 0 0 40px rgba(251, 146, 60, 0.3)",
                fontFamily: "monospace",
              }}
            >
              {t('confirmLogout', 'Confirm Logout')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Warning Message */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <p className="text-cyan-100 text-base leading-relaxed">
                {t('logoutWarning', 'Are you sure you want to logout? You\'ll need to sign in again to continue your space adventure.')}
              </p>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Button
                onClick={onCancel}
                variant="outline"
                className="flex-1 bg-white/10 backdrop-blur-lg border-white/20 text-white hover:bg-white/20 transition-all duration-300 font-mono"
                disabled={isLoggingOut}
              >
                {t('cancel', 'Cancel')}
              </Button>
              
              <Button
                onClick={handleConfirm}
                disabled={isLoggingOut}
                className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-lg shadow-md disabled:opacity-50 flex items-center gap-2 font-mono"
              >
                {isLoggingOut ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {t('loggingOut', 'Logging out...')}
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    {t('logout', 'Logout')}
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

