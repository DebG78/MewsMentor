import { AdminSidebar } from './AdminSidebar'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { User, Shield, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useUser } from '@/contexts/UserContext'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { userProfile } = useUser()

  const handleAdminToggle = (checked: boolean) => {
    if (checked) {
      navigate('/admin')
    } else {
      navigate('/growth')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Admin Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-8 py-3 flex items-center justify-end gap-3">
            {/* Admin/User Toggle */}
            {userProfile?.type === 'admin' && (
              <div className="flex items-center space-x-3 px-3 py-2 bg-muted/50 rounded-lg">
                <Label htmlFor="admin-mode" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <User className="w-4 h-4" />
                  User Experience
                </Label>
                <Switch
                  id="admin-mode"
                  checked={true}
                  onCheckedChange={handleAdminToggle}
                />
                <Label htmlFor="admin-mode" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <Shield className="w-4 h-4" />
                  Admin Panel
                </Label>
              </div>
            )}

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
