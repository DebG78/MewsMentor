import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search } from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate()
  const { userProfile } = useUser()
  const [searchValue, setSearchValue] = useState('')

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      navigate(`/admin/people/profiles?q=${encodeURIComponent(searchValue.trim())}`)
      setSearchValue('')
    }
  }

  return (
    <div className="relative min-h-screen">
      {/* Two-tone page background behind everything */}
      <div className="absolute inset-0 -z-10">
        <div className="h-96 bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-[calc(100%-24rem)] bg-zinc-100 dark:bg-zinc-900" />
      </div>

      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <SidebarInset className="!bg-transparent">
          <header className="flex h-16 shrink-0 items-center justify-end gap-2 px-6">
              <div className="relative hidden md:block">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search profiles..."
                  className="w-64 pl-8 h-9"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={handleSearch}
                />
              </div>
              <SidebarTrigger />
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {userProfile?.email?.slice(0, 2).toUpperCase() || 'AD'}
                </AvatarFallback>
              </Avatar>
          </header>

          <div className="flex flex-1 flex-col gap-4 p-6 pt-2">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
