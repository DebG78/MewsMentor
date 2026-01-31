import { AdminSidebar } from './AdminSidebar'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Admin Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-8 py-3 flex items-center justify-end gap-3">
          {/* Theme Toggle */}
          <Button variant="outline" size="sm" onClick={toggleTheme}>
            {theme === 'light' ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
