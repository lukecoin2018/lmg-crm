'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { AppShell } from '@/components/app-shell'
import { TrendingUp, Calendar, BarChart3, Settings } from 'lucide-react'

const apps = [
  {
    id: 'deal-flow',
    name: 'Deal Flow',
    description: 'Manage brand deals from lead to payment',
    icon: TrendingUp,
    href: '/apps/deal-flow',
    color: 'from-purple-500 to-pink-500',
    active: true,
    stats: { label: 'Active Deals', value: '0' }
  },
  {
    id: 'content-calendar',
    name: 'Content Calendar',
    description: 'Plan and schedule your content pipeline',
    icon: Calendar,
    href: '/apps/content-calendar',
    color: 'from-blue-500 to-cyan-500',
    active: false,
    comingSoon: true
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Track performance across all platforms',
    icon: BarChart3,
    href: '/apps/analytics',
    color: 'from-green-500 to-emerald-500',
    active: false,
    comingSoon: true
  }
]

export default function DashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [dealCount, setDealCount] = useState(0)

  useEffect(() => {
    checkUser()
    loadStats()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUserId(user.id)
  }

  async function loadStats() {
    if (!userId) return
    
    const { data: deals } = await supabase
      .from('deals')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
    
    if (deals) {
      setDealCount(deals.length)
    }
  }

  const handleAppClick = (app: typeof apps[0]) => {
    if (!app.active) return
    router.push(app.href)
  }

  return (
    <AppShell>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Your Creator Hub
          </h1>
          <p className="text-gray-600">
            Manage your entire creator business from one place
          </p>
        </div>

        {/* Apps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => {
            const Icon = app.icon
            
            return (
              <div
                key={app.id}
                onClick={() => handleAppClick(app)}
                className={`
                  relative bg-white rounded-xl border-2 p-6 transition-all
                  ${app.active 
                    ? 'border-gray-200 hover:border-purple-300 hover:shadow-lg cursor-pointer' 
                    : 'border-gray-100 opacity-60 cursor-not-allowed'
                  }
                `}
              >
                {/* Coming Soon Badge */}
                {app.comingSoon && (
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">
                      Coming Soon
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className={`
                  w-12 h-12 rounded-lg bg-gradient-to-br ${app.color} 
                  flex items-center justify-center mb-4
                `}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {app.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {app.description}
                </p>

                {/* Stats (only for active apps) */}
                {app.active && app.stats && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {app.stats.label}
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {app.id === 'deal-flow' ? dealCount : app.stats.value}
                      </span>
                    </div>
                  </div>
                )}

                {/* Launch Arrow */}
                {app.active && (
                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg 
                      className="w-5 h-5 text-purple-600" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M13 7l5 5m0 0l-5 5m5-5H6" 
                      />
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Start</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push('/apps/deal-flow')}
              className="flex items-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow text-left"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Add New Deal</h3>
                <p className="text-sm text-gray-600">Start tracking a brand opportunity</p>
              </div>
            </button>
            
            <button
              onClick={() => router.push('/settings')}
              className="flex items-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow text-left"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <Settings className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Customize Hub</h3>
                <p className="text-sm text-gray-600">Personalize your workspace</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}