"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/language-context'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <ErrorFallback 
        error={this.state.error} 
        onRetry={this.handleRetry}
        onGoHome={this.handleGoHome}
      />
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error?: Error
  onRetry: () => void
  onGoHome: () => void
}

function ErrorFallback({ error, onRetry, onGoHome }: ErrorFallbackProps) {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* Space Background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/galaxy.webp')",
          }}
        />
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      <div className="relative z-10 max-w-md mx-auto p-6 text-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
          className="mb-6"
        >
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-red-500/30 to-orange-500/30 backdrop-blur-xl rounded-2xl flex items-center justify-center border-2 border-red-400/50 shadow-lg shadow-red-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-400/10 to-orange-400/10 animate-pulse"></div>
            <AlertTriangle className="w-10 h-10 text-red-400 relative z-10" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <h1 className="text-2xl font-bold text-transparent bg-gradient-to-r from-red-300 via-orange-300 to-yellow-300 bg-clip-text font-mono">
            {t('error', 'Oops! Something went wrong')}
          </h1>
          
          <p className="text-gray-300 font-mono text-sm">
            {t('errorDescription', 'The space quiz encountered an unexpected error. Don\'t worry, your progress is safe!')}
          </p>

          {process.env.NODE_ENV === 'development' && error && (
            <details className="text-left bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-red-400/30">
              <summary className="text-red-300 font-mono text-sm cursor-pointer mb-2">
                {t('errorDetails', 'Error Details (Development)')}
              </summary>
              <pre className="text-xs text-red-200 font-mono overflow-auto">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={onRetry}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-2 px-4 rounded-xl shadow-lg shadow-cyan-500/30 border border-cyan-400/30 backdrop-blur-sm font-mono relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 animate-pulse"></div>
                <div className="flex items-center justify-center space-x-2 relative z-10">
                  <RefreshCw className="w-4 h-4" />
                  <span>{t('retry', 'Try Again')}</span>
                </div>
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={onGoHome}
                variant="outline"
                className="w-full bg-transparent border-2 border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/10 font-semibold py-2 px-4 rounded-xl backdrop-blur-sm font-mono"
              >
                <div className="flex items-center justify-center space-x-2">
                  <Home className="w-4 h-4" />
                  <span>{t('goHome', 'Go Home')}</span>
                </div>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

