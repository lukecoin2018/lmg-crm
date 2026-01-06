'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  Settings, 
  Menu,
  X,
  LogOut
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const apps = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: LayoutDashboard,
    active: true 
  },
  { 
    name: 'Deal Flow', 
    href: '/apps/deal-flow', 
    icon: TrendingUp,
    active: true 
  },
  { 
    name: 'Content Calendar', 
    href: '/apps/content-calendar', 
    icon: Calendar,
    active: false,
    comingSoon: true 
  },
  { 
    name: 'Analytics', 
    href: '/apps/analytics', 
    icon: BarChart3,
    active: false,
    comingSoon: true 
  },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-gray-200">
        <div className="flex items-center h-16 px-6 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg" />
            <span className="text-xl font-bold text-gray-900">LMG Hub</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {apps.map((app) => {
            const Icon = app.icon
            const isActive = pathname === app.href || pathname?.startsWith(app.href + '/')
            
            return (
              <Link
                key={app.name}
                href={app.active ? app.href : '#'}
                className={`
                  flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-purple-50 text-purple-700' 
                    : app.active 
                      ? 'text-gray-700 hover:bg-gray-100' 
                      : 'text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-3" />
                {app.name}
                {app.comingSoon && (
                  <span className="ml-auto text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                    Soon
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <Link
            href="/settings"
            className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mb-2"
          >
            <Settings className="w-5 h-5 mr-3" />
            Settings
          </Link>
          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="absolute inset-0 bg-gray-900 bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white">
            <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg" />
                <span className="text-xl font-bold text-gray-900">LMG Hub</span>
              </Link>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1">
              {apps.map((app) => {
                const Icon = app.icon
                const isActive = pathname === app.href
                
                return (
                  <Link
                    key={app.name}
                    href={app.active ? app.href : '#'}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                      ${isActive 
                        ? 'bg-purple-50 text-purple-700' 
                        : app.active 
                          ? 'text-gray-700 hover:bg-gray-100' 
                          : 'text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {app.name}
                    {app.comingSoon && (
                      <span className="ml-auto text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        Soon
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar - Mobile */}
        <header className="md:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg" />
            <span className="text-xl font-bold text-gray-900">LMG Hub</span>
          </Link>
          <div className="w-6" /> {/* Spacer for centering */}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}