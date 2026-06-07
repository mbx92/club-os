/**
 * Debug Utility
 * 
 * Provides debug-aware console logging that respects VITE_DEBUG environment variable.
 * When VITE_DEBUG is 'false' or not set in production, logs are suppressed.
 * 
 * Usage:
 * import { debug, isDev, isDebug } from '@/utils/debug'
 * 
 * debug.log('Hello')      // Only logs when debug is enabled
 * debug.error('Error!')   // Always logs errors
 * debug.warn('Warning')   // Only logs when debug is enabled
 * 
 * if (isDev) { ... }      // Check if in development mode
 * if (isDebug) { ... }    // Check if debug mode is enabled
 */

// Development mode (Vite built-in)
export const isDev = import.meta.env.DEV

// Debug mode (can be toggled via .env VITE_DEBUG=true/false)
// In development: defaults to true unless explicitly set to false
// In production: defaults to false unless explicitly set to true
export const isDebug = import.meta.env.VITE_DEBUG === 'true' || 
  (import.meta.env.DEV && import.meta.env.VITE_DEBUG !== 'false')

/**
 * Debug-aware console wrapper
 * - log, warn, info: Only output when isDebug is true
 * - error: Always output (errors should always be visible)
 */
export const debug = {
  log: (...args) => {
    if (isDebug) {
      console.log(...args)
    }
  },
  
  warn: (...args) => {
    if (isDebug) {
      console.warn(...args)
    }
  },
  
  info: (...args) => {
    if (isDebug) {
      console.info(...args)
    }
  },
  
  // Errors are always logged regardless of debug mode
  error: (...args) => {
    console.error(...args)
  },
  
  // Table output for debugging data structures
  table: (...args) => {
    if (isDebug) {
      console.table(...args)
    }
  },
  
  // Group related logs together
  group: (label) => {
    if (isDebug) {
      console.group(label)
    }
  },
  
  groupEnd: () => {
    if (isDebug) {
      console.groupEnd()
    }
  },
  
  // Time tracking for performance debugging
  time: (label) => {
    if (isDebug) {
      console.time(label)
    }
  },
  
  timeEnd: (label) => {
    if (isDebug) {
      console.timeEnd(label)
    }
  }
}

export default debug
