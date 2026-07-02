'use client'

import { useEffect, useState } from 'react'

export function PwaRegister() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').then(
          function(registration) {
            console.log('Service Worker registration successful with scope: ', registration.scope);
          },
          function(err) {
            console.log('ServiceWorker registration failed: ', err);
          }
        );
      });
    }

    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    if (!navigator.onLine) {
      setIsOffline(true)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOffline) {
    return (
      <div className="fixed top-0 left-0 w-full bg-warning-orange text-white text-xs font-medium py-1 px-4 text-center z-50">
        Mode hors-ligne — données en lecture seule, dernière synchronisation : {new Date().toLocaleTimeString()}
      </div>
    )
  }

  return null
}
