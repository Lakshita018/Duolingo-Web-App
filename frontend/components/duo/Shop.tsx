'use client'

import { useState } from 'react'
import { Gem, Lock, Zap, Shield, ChevronRight } from 'lucide-react'
import type { User } from '@/lib/types'

export default function Shop({ user, onRefill }: { user: User; onRefill: (m: string) => void }) {
  const [familyModal, setFamilyModal] = useState(false)
  const isHeartsFull = user.hearts >= user.maxHearts
  const canAffordRefill = user.gems >= 350

  const handleRefillClick = () => {
    if (!isHeartsFull && canAffordRefill) {
      onRefill('gems')
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-4 pb-28">
      <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
        {/* Main Left Content Area */}
        <div className="flex-1 w-full max-w-2xl">
          {/* Top Super Family Plan Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#171444] via-[#241a63] to-[#401f78] p-6 sm:p-8 text-white mb-8 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="max-w-xs z-10">
                <h1 className="text-2xl sm:text-3xl font-black leading-tight mb-2">
                  Start a family plan!
                </h1>
                <p className="text-white/80 text-sm font-bold mb-6">
                  Save on <span className="font-extrabold text-[#7dd3fc]">Super Duolingo</span> when you learn with friends
                </p>
                <button
                  type="button"
                  onClick={() => setFamilyModal(true)}
                  className="w-full sm:w-auto bg-white hover:bg-white/95 text-[#1b1747] font-black uppercase text-xs tracking-wider px-8 py-3.5 rounded-2xl shadow-[0_4px_0_#d1d5db] active:translate-y-1 active:shadow-none transition-all"
                >
                  LEARN MORE
                </button>
              </div>

              {/* Characters Illustration */}
              <div className="sm:absolute sm:right-4 sm:bottom-0 flex justify-center sm:justify-end w-full sm:w-auto">
                <img
                  src="https://d35aaqx5ub95lt.cloudfront.net/images/super/0c25e40bb026a7dc4b49d715a7dc40e4.svg"
                  alt="Duolingo Family Characters"
                  className="w-48 sm:w-64 md:w-72 object-contain"
                />
              </div>
            </div>
          </div>

          {/* Hearts Section */}
          <section className="mb-8">
            <h2 className="text-xl sm:text-2xl font-black ink mb-4">Hearts</h2>
            <div className="divide-y-2 divide-outline border-y-2 border-outline">
              {/* Row 1: Refill Hearts */}
              <div className="py-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                    <img
                      src="https://d35aaqx5ub95lt.cloudfront.net/images/hearts/547ffcf0e6256af421ad1a32c26b8f1a.svg"
                      alt="Refill Hearts"
                      className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
                    />
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-black ink">Refill Hearts</div>
                    <div className="text-xs sm:text-sm font-bold text-[#777] dark:text-[#aaa] max-w-md">
                      Get full hearts so you can worry less about making mistakes in a lesson
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={handleRefillClick}
                    disabled={isHeartsFull || !canAffordRefill}
                    className={`px-5 py-2.5 rounded-2xl border-2 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                      isHeartsFull
                        ? 'border-outline text-[#afafaf] cursor-not-allowed bg-transparent'
                        : canAffordRefill
                        ? 'border-outline hover:border-[#1cb0f6] text-[#1cb0f6] surface shadow-[0_2px_0_var(--shadow-outline)] active:translate-y-0.5'
                        : 'border-outline text-[#afafaf] cursor-not-allowed'
                    }`}
                  >
                    {isHeartsFull ? (
                      'FULL'
                    ) : (
                      <>
                        <span>GET FOR:</span>
                        <Gem className="w-4 h-4 fill-[#1cb0f6] text-[#1cb0f6]" />
                        <span>350</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Row 2: Unlimited Hearts */}
              <div className="py-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                    <img
                      src="https://d35aaqx5ub95lt.cloudfront.net/images/hearts/4f3842c690acf9bf0d4b06e6ab2fffcf.svg"
                      alt="Unlimited Hearts"
                      className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
                    />
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-black ink">Unlimited Hearts</div>
                    <div className="text-xs sm:text-sm font-bold text-[#777] dark:text-[#aaa] max-w-md">
                      Never run out of hearts with Super!
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setFamilyModal(true)}
                    className="px-5 py-2.5 rounded-2xl border-2 border-outline hover:border-[#ce82ff] surface text-[#ce82ff] font-black text-xs uppercase tracking-wider shadow-[0_2px_0_var(--shadow-outline)] active:translate-y-0.5 transition-all"
                  >
                    FREE TRIAL
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Power-Ups Section */}
          <section className="mb-8">
            <h2 className="text-xl sm:text-2xl font-black ink mb-4">Power-Ups</h2>
            <div className="divide-y-2 divide-outline border-y-2 border-outline">
              {/* Row 1: Streak Freeze */}
              <div className="py-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#00cd9c]/10 border-2 border-[#00cd9c]/30 flex items-center justify-center text-3xl">
                      🧊
                    </div>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-base sm:text-lg font-black ink">Streak Freeze</span>
                      <span className="bg-[#58cc02]/15 text-[#58cc02] text-[11px] font-black uppercase px-2.5 py-0.5 rounded-lg">
                        2 / 2 EQUIPPED
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-[#777] dark:text-[#aaa] max-w-md">
                      Streak Freeze allows your streak to remain in place for one full day of inactivity.
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    disabled
                    className="px-6 py-2.5 rounded-2xl border-2 border-outline text-[#afafaf] font-black text-xs uppercase tracking-wider cursor-default bg-transparent"
                  >
                    EQUIPPED
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Rail Widgets (Matching Screenshot) */}
        <aside className="hidden lg:flex flex-col gap-6 w-[340px] shrink-0 sticky top-20">
          {/* Unlock Leaderboards Card */}
          <div className="surface border-2 border-outline rounded-3xl p-5 shadow-sm">
            <h3 className="font-black ink text-lg mb-4">Unlock Leaderboards!</h3>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#e5e5e5]/50 dark:bg-white/10 flex items-center justify-center text-[#999] shrink-0">
                <Shield className="w-7 h-7 stroke-[2]" />
              </div>
              <p className="text-sm font-bold text-[#777] dark:text-[#aaa]">
                Complete 1 more lesson to start competing
              </p>
            </div>
          </div>

          {/* Daily Quests Card */}
          <div className="surface border-2 border-outline rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black ink text-lg">Daily Quests</h3>
              <span className="text-xs font-black uppercase text-duo-blue cursor-pointer hover:underline">
                VIEW ALL
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-3xl">⚡</div>
              <div className="flex-1">
                <div className="text-sm font-black ink mb-1.5">Earn 30 XP</div>
                <div className="h-3.5 bg-outline rounded-full overflow-hidden">
                  <div
                    className="h-full bg-duo-yellow transition-all duration-300 rounded-full"
                    style={{ width: `${Math.min(100, ((user.dailyXp || 0) / 30) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-2xl">📦</div>
            </div>
          </div>

          {/* Discover More / Links Card */}
          <div className="surface border-2 border-outline rounded-3xl p-5 shadow-sm">
            <div className="bg-[#1cb0f6]/10 text-duo-blue font-black text-sm p-3.5 rounded-2xl mb-4">
              Discover more
            </div>
            <div className="divide-y border-y border-outline text-sm font-bold text-[#777] dark:text-[#aaa]">
              <div className="py-3 flex items-center justify-between hover:text-ink cursor-pointer transition">
                <span>Language learning material</span>
                <ChevronRight className="w-4 h-4 text-[#aaa]" />
              </div>
              <div className="py-3 flex items-center justify-between hover:text-ink cursor-pointer transition">
                <span>Educational games</span>
                <ChevronRight className="w-4 h-4 text-[#aaa]" />
              </div>
              <div className="py-3 flex items-center justify-between hover:text-ink cursor-pointer transition">
                <span>Language learning subscription</span>
                <ChevronRight className="w-4 h-4 text-[#aaa]" />
              </div>
            </div>
            <div className="text-center pt-4">
              <button
                type="button"
                className="text-xs font-black uppercase tracking-wider text-duo-blue hover:underline"
              >
                REMOVE ADS
              </button>
            </div>
          </div>

          {/* Legal / Site Footer Links */}
          <div className="text-[11px] font-black uppercase tracking-wider text-[#afafaf] flex flex-wrap gap-x-3 gap-y-1.5 px-2">
            <span className="hover:underline cursor-pointer">ABOUT</span>
            <span className="hover:underline cursor-pointer">BLOG</span>
            <span className="hover:underline cursor-pointer">STORE</span>
            <span className="hover:underline cursor-pointer">EFFICACY</span>
            <span className="hover:underline cursor-pointer">CAREERS</span>
            <span className="hover:underline cursor-pointer">INVESTORS</span>
            <span className="hover:underline cursor-pointer">TERMS</span>
            <span className="hover:underline cursor-pointer">PRIVACY</span>
          </div>
        </aside>
      </div>

      {/* Family Plan Information Modal */}
      {familyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="surface border-2 border-outline rounded-3xl max-w-md w-full p-6 text-center shadow-xl animate-in zoom-in-95 duration-150">
            <img
              src="https://d35aaqx5ub95lt.cloudfront.net/images/super/0c25e40bb026a7dc4b49d715a7dc40e4.svg"
              alt="Super Duolingo"
              className="w-48 mx-auto mb-4"
            />
            <h3 className="text-2xl font-black ink mb-2">Super Duolingo Family Plan</h3>
            <p className="text-sm font-bold text-[#777] dark:text-[#aaa] mb-6">
              Share Unlimited Hearts, zero interruptions, and personalized review with up to 6 family members or friends!
            </p>
            <button
              type="button"
              onClick={() => setFamilyModal(false)}
              className="duo-btn duo-btn-green w-full py-3 text-sm font-black uppercase mb-2"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
