import { useThemeStore } from '../../store/themeStore'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const theme = useThemeStore(s => s.theme)
  const toggleTheme = useThemeStore(s => s.toggleTheme)

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-xl border transition-colors ${
        theme === 'dark'
          ? 'bg-surface-800 hover:bg-surface-700 border-surface-700'
          : 'bg-gray-100 hover:bg-gray-200 border-gray-200'
      }`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun size={16} className="text-yellow-400" />
      ) : (
        <Moon size={16} className="text-blue-600" />
      )}
    </button>
  )
}
