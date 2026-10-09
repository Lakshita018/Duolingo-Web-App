'use client'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Home, Trophy, User, ShoppingBag, MoreHorizontal, Languages } from 'lucide-react'

type View = 'learn' | 'letters' | 'leaderboard' | 'shop' | 'profile' | 'settings' | 'help'

const ICONS = {
  learn: 'https://d35aaqx5ub95lt.cloudfront.net/vendor/784035717e2ff1d448c0f6cc4efc89fb.svg',
  leaderboard: 'https://d35aaqx5ub95lt.cloudfront.net/vendor/ca9178510134b4b0893dbac30b6670aa.svg',
  shop: 'https://d35aaqx5ub95lt.cloudfront.net/vendor/0e58a94dda219766d98c7796b910beee.svg',
  more: 'https://d35aaqx5ub95lt.cloudfront.net/vendor/7159c0b5d4250a5aea4f396d53f17f0c.svg',
}

const NAV: { id: View; label: string; icon: any; color: string; bg: string; border: string }[] = [
  { id: 'learn', label: 'Learn', icon: Home, color: 'text-duo-blue', bg: 'bg-duo-blue/10 dark:bg-duo-blue/20', border: 'border-duo-blue' },
  { id: 'letters', label: 'Letters', icon: Languages, color: 'text-duo-blue', bg: 'bg-duo-blue/10 dark:bg-duo-blue/20', border: 'border-duo-blue' },
  { id: 'leaderboard', label: 'Leaderboards', icon: Trophy, color: 'text-duo-yellow', bg: 'bg-duo-yellow/10 dark:bg-duo-yellow/20', border: 'border-duo-yellow' },
  { id: 'shop', label: 'Shop', icon: ShoppingBag, color: 'text-duo-red', bg: 'bg-duo-red/10 dark:bg-duo-red/20', border: 'border-duo-red' },
  { id: 'profile', label: 'Profile', icon: User, color: 'text-duo-purple', bg: 'bg-duo-purple/10 dark:bg-duo-purple/20', border: 'border-duo-purple' },
  { id: 'settings', label: 'More', icon: MoreHorizontal, color: 'ink-3', bg: 'surface-2', border: 'border-outline' },
]

export default function Sidebar({ view, setView, onLogout }: { view: View; setView: (v: View) => void; onLogout: () => void }) {
  const [moreOpen, setMoreOpen] = useState(false)
  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[260px] border-r-2 border-outline surface flex-col p-4 z-40">
      <div className="flex items-center gap-2 px-3 py-4 mb-4">
        <img
          src="https://d35aaqx5ub95lt.cloudfront.net/images/splash/f92d5f2f7d56636846861c458c0d0b6c.svg"
          alt="Duolingo"
          className="h-16 w-auto max-w-[190px] object-contain"
        />
      </div>
      <nav className="flex flex-col gap-2">
        {NAV.map(item => {
          const Icon = item.icon
          const active = view === item.id
          if (item.id === 'settings') return (
            <div key={item.id} className="relative">
              <button onClick={() => setMoreOpen(open => !open)}
                className={cn('w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-bold uppercase tracking-wide text-sm transition-all border-2',
                  moreOpen ? `${item.bg} ${item.border} ${item.color}` : 'border-transparent ink-2 hover:surface-2')}>
                <img src={ICONS.more} alt="" className="w-8 h-8" />
                <span>{item.label}</span>
              </button>
              {moreOpen && (
                <div className="more-menu">
                  <div className="more-menu-title">Duolingo App</div>
                  <button onClick={() => { setView('settings'); setMoreOpen(false) }}>Settings</button>
                  <button onClick={() => { setView('help'); setMoreOpen(false) }}>Help</button>
                  <button onClick={onLogout}>Log out</button>
                </div>
              )}
            </div>
          )
          return (
            <button key={item.id} onClick={() => setView(item.id)}
              className={cn(
                'flex items-center gap-4 px-4 py-3 rounded-2xl font-bold uppercase tracking-wide text-sm transition-all border-2',
                active ? `${item.bg} ${item.border} ${item.color}` : 'border-transparent ink-2 hover:surface-2'
              )}>
              {item.id in ICONS ? <img src={ICONS[item.id as keyof typeof ICONS]} alt="" className="w-8 h-8" /> : <Icon className={cn('w-8 h-8', active ? item.color : 'ink-3')} strokeWidth={2.5} />}
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      
    </aside>
  )
}

export function MobileNav({ view, setView, onLogout }: { view: View; setView: (v: View) => void; onLogout: () => void }) {
  const [moreOpen, setMoreOpen] = useState(false)
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t-2 border-outline surface z-40 flex justify-around py-2">
      {NAV.filter(n => n.id !== 'settings').map(item => {
        const Icon = item.icon
        const active = view === item.id
        return (
          <button key={item.id} onClick={() => setView(item.id)}
            className={cn('flex flex-col items-center px-3 py-2 rounded-xl border-2', active ? `${item.bg} ${item.border}` : 'border-transparent')}>
            {item.id in ICONS ? <img src={ICONS[item.id as keyof typeof ICONS]} alt="" className="w-6 h-6" /> : <Icon className={cn('w-6 h-6', active ? item.color : 'ink-3')} strokeWidth={2.5} />}
          </button>
        )
      })}
      <button onClick={() => setMoreOpen(open => !open)} className="flex flex-col items-center px-3 py-2 rounded-xl border-2 border-transparent">
        <img src={ICONS.more} alt="More" className="w-6 h-6" />
      </button>
      {moreOpen && (
        <div className="more-menu more-menu-mobile">
          <div className="more-menu-title">Duolingo App</div>
          <button onClick={() => setView('settings')}>Settings</button>
          <button onClick={() => setView('help')}>Help</button>
          <button onClick={onLogout}>Log out</button>
        </div>
      )}
    </nav>
  )
}
