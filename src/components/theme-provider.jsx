import { createContext, useContext, useEffect, useState } from 'react'

const ThemeProviderContext = createContext(undefined)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'bookcocoon-ui-theme',
  ...props
}) {
  const [theme, setTheme] = useState(() => localStorage.getItem(storageKey) || defaultTheme)

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    function applySystemTheme() {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
    }

    if (theme === 'system') {
      applySystemTheme()
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', applySystemTheme)
      return () => mediaQuery.removeEventListener('change', applySystemTheme)
    }

    root.classList.add(theme)
  }, [theme])

  function handleSetTheme(newTheme) {
    localStorage.setItem(storageKey, newTheme)
    setTheme(newTheme)
  }

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme: handleSetTheme }} {...props}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
