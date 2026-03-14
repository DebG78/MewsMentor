import { AppSidebar } from './AppSidebar'
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
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
          <div className="flex flex-1 flex-col gap-4 p-6 pt-10">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
