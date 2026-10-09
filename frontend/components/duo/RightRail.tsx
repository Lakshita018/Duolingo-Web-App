'use client'
import { Zap } from 'lucide-react'
import { toast } from 'sonner'
import type { User } from '@/lib/types'

export default function RightRail({
  user,
  onNavigate,
}: {
  user: User | null
  onNavigate?: (view: any) => void
}) {
  if (!user) return null
  const goal = user.dailyGoal || 30
  const progress = Math.min(100, ((user.dailyXp || 15) / goal) * 100)

  return (
    <aside className="hidden lg:flex flex-col gap-4 w-[340px] shrink-0 py-8 px-2 sticky top-16 h-fit select-none">
      {/* 1. Try Super for Free Card */}
      <div
        className="rounded-2xl border-2 border-outline p-5 relative overflow-hidden surface"
        style={{ boxShadow: '0 2px 0 var(--shadow-outline)' }}
      >
        <div className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black italic tracking-widest text-white bg-gradient-to-r from-[#ce82ff] via-[#1cb0f6] to-[#00cd9c] mb-2 shadow-sm">
          SUPER
        </div>
        <h3 className="font-black text-lg text-ink leading-tight mb-1">Try Super for free</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-snug mb-4 max-w-[190px]">
          No ads, personalized practice, and unlimited Legendary!
        </p>

        {/* Flying Super Duo Bird */}
        <img
          src="https://d35aaqx5ub95lt.cloudfront.net/images/super/fb7130289a205fadd2e196b9cc866555.svg"
          alt="Super Duo"
          className="absolute top-2 right-2 w-28 h-auto pointer-events-none select-none"
        />

        <button
          type="button"
          onClick={() => toast.success('Super Duolingo trial active! Unlimited hearts & Legendary unlocked.')}
          className="w-full py-3 rounded-2xl font-black text-sm uppercase tracking-wider text-white transition-all active:translate-y-0.5 cursor-pointer"
          style={{ background: '#495bf7', boxShadow: '0 4px 0 #3344d6' }}
        >
          TRY 1 WEEK FREE
        </button>
      </div>

      {/* 2. Bronze League Card */}
      <div
        className="rounded-2xl border-2 border-outline p-5 surface"
        style={{ boxShadow: '0 2px 0 var(--shadow-outline)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-base text-ink">Bronze League</h3>
          <button
            type="button"
            onClick={() => onNavigate?.('leaderboard')}
            className="text-xs font-black uppercase tracking-wider text-duo-blue hover:opacity-80 transition-opacity cursor-pointer"
          >
            VIEW LEAGUE
          </button>
        </div>
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 border-[#b86a2f]/40"
            style={{
              background: 'linear-gradient(180deg, #f7c58f 0%, #d48039 100%)',
              boxShadow: '0 3px 0 #a35d24',
            }}
          >
            <span className="text-2xl select-none">🪶</span>
          </div>
          <div>
            <div className="font-bold text-sm text-ink">You&apos;re ranked #12</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
              You&apos;ve earned {user.xp || 35} XP this week so far
            </div>
          </div>
        </div>
      </div>

      {/* 3. Daily Quests Card */}
      <div
        className="rounded-2xl border-2 border-outline p-5 surface"
        style={{ boxShadow: '0 2px 0 var(--shadow-outline)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-base text-ink">Daily Quests</h3>
          <button
            type="button"
            onClick={() => onNavigate?.('shop')}
            className="text-xs font-black uppercase tracking-wider text-duo-blue hover:opacity-80 transition-opacity cursor-pointer"
          >
            VIEW ALL
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center shrink-0">
            <Zap className="w-7 h-7 text-duo-yellow fill-duo-yellow" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-xs text-ink mb-1.5">Earn {goal} XP</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-3.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-duo-yellow transition-all duration-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-gray-700 dark:text-gray-200">
                  {user.dailyXp || 15} / {goal}
                </span>
              </div>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#a0522d" className="shrink-0">
                <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2H4V6zm-1 4h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8zm8 2a1 1 0 0 0-1 1v2a1 1 0 0 0 2 0v-2a1 1 0 0 0-1-1z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
