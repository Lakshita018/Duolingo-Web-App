'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, Flame, Pencil, Search, Zap, Shield, Trophy } from 'lucide-react'
import type { Achievement, User } from '@/lib/types'
import { getLanguageFlag } from '@/lib/language'

type ProfileProps = {
  user: User
  onUpdate: (patch: { name?: string; avatar?: string }) => void
  achievements: Achievement[]
}

const AVATARS = [
  'avatar-sun', 'avatar-moon', 'avatar-sky', 'avatar-coral',
  'avatar-leaf', 'avatar-lilac', 'avatar-citrus', 'avatar-ocean',
  'avatar-rose', 'avatar-amber',
]

function makeUsername(user: User): string {
  if (!user.email) return `Learner${user.id.slice(-4)}`
  const local = user.email.split('@')[0]
  const clean = local.replace(/[^a-zA-Z0-9]/g, '')
  return clean.slice(0, 10) + user.id.slice(-4)
}

export default function Profile({ user, onUpdate, achievements }: ProfileProps) {
  const [name, setName] = useState(user.name || 'Learner')
  const [showAvatars, setShowAvatars] = useState(false)
  const [socialTab, setSocialTab] = useState<'following' | 'followers'>('following')

  useEffect(() => setName(user.name || 'Learner'), [user.name])

  const joinedDate = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  })
  const username = makeUsername(user)
  const leagueDisplay = 'None'
  const top3Finishes = 0

  function saveName() {
    const next = name.trim().slice(0, 40)
    if (next && next !== user.name) { setName(next); onUpdate({ name: next }) }
  }

  return (
    <div className="profile-page mx-auto w-full max-w-[1040px] pb-24 px-2 sm:px-4">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">

        {/* LEFT COLUMN */}
        <section>
          {/* Hero card */}
          <div className="profile-hero">
            <div className="profile-cover">
              <div className="profile-avatar-placeholder">
                <AvatarMark avatar={user.avatar} large />
              </div>
              <button
                aria-label="Edit avatar"
                className="profile-edit-button"
                onClick={() => setShowAvatars(v => !v)}
                type="button"
              >
                <Pencil size={14} />
              </button>
            </div>

            <div className="profile-identity">
              <input
                aria-label="Learner name"
                className="profile-name-input"
                onBlur={saveName}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                value={name}
              />
              <div className="profile-username">{username}</div>
              <div className="profile-joined">Joined {joinedDate}</div>
              <div className="profile-following">
                <button type="button" className="profile-follow-link">
                  <strong>0</strong> Following
                </button>
                <button type="button" className="profile-follow-link ml-4">
                  <strong>0</strong> Followers
                </button>
              </div>
            </div>

            <div className="profile-course">
              <span className="text-3xl">{getLanguageFlag(user.targetLanguage || user.language)}</span>
            </div>
          </div>

          {/* Avatar picker */}
          {showAvatars && (
            <div className="profile-avatar-picker mt-3">
              <p className="text-[10px] font-black uppercase tracking-wider ink-3 mb-2 px-1">Choose avatar</p>
              <div className="flex flex-wrap gap-2">
                {AVATARS.map(av => (
                  <button
                    aria-label={`Select ${av.replace('avatar-', '')} avatar`}
                    className={`profile-avatar-option ${av === user.avatar ? 'is-selected' : ''}`}
                    key={av}
                    onClick={() => { onUpdate({ avatar: av }); setShowAvatars(false) }}
                    type="button"
                  >
                    <AvatarMark avatar={av} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Statistics */}
          <section className="profile-section mt-6">
            <h2 className="profile-section-title">Statistics</h2>
            <div className="profile-stats-grid">
              <StatCard
                icon={<Flame size={20} className="text-[#ff9600]" />}
                value={user.streak || 0}
                label="Day streak"
                bg="bg-[#fff4e6] dark:bg-[#ff9600]/10"
              />
              <StatCard
                icon={<Zap size={20} className="text-[#ffc800]" />}
                value={user.xp || 0}
                label="Total XP"
                bg="bg-[#fffde0] dark:bg-[#ffc800]/10"
              />
              <StatCard
                icon={<Shield size={20} className="text-[#afafaf]" />}
                value={leagueDisplay}
                label="Current league"
                bg="bg-[#f0f2f3] dark:bg-white/5"
                valueClass="text-[#afafaf]"
              />
              <StatCard
                icon={<Trophy size={20} className="text-[#ffc800]" />}
                value={top3Finishes}
                label="Top 3 finishes"
                bg="bg-[#fffde0] dark:bg-[#ffc800]/10"
              />
            </div>
          </section>

          {/* Achievements */}
          <section className="profile-section mt-6">
            <div className="profile-section-heading mb-3">
              <h2 className="profile-section-title" style={{marginBottom: 0}}>Achievements</h2>
              <button type="button" className="text-[#1c9ee0] text-[11px] font-black uppercase tracking-wider hover:underline">
                VIEW ALL
              </button>
            </div>
            <div className="rounded-2xl border-2 border-outline overflow-hidden surface">
              {achievements.length > 0 ? achievements.slice(0, 5).map((ach, i) => (
                <AchievementRow key={ach.id} achievement={ach} index={i} userXp={user.xp} />
              )) : (
                <div className="profile-empty">Complete lessons to unlock achievements.</div>
              )}
            </div>
          </section>
        </section>

        {/* RIGHT COLUMN */}
        <aside className="flex flex-col gap-4">
          {/* Top metrics bar */}
          <div className="rounded-2xl border-2 border-outline surface p-3 flex items-center justify-around gap-2">
            <TopMetric emoji={getLanguageFlag(user.targetLanguage || user.language)} value={user.xp || 0} label="XP" />
            <div className="w-px h-8 bg-outline" />
            <TopMetric emoji="🔥" value={user.streak || 0} label="streak" />
            <div className="w-px h-8 bg-outline" />
            <TopMetric emoji="💎" value={user.gems || 0} label="gems" />
            <div className="w-px h-8 bg-outline" />
            <TopMetric emoji="❤️" value={user.hearts || 0} label="hearts" />
          </div>

          {/* Social Following / Followers */}
          <div className="rounded-2xl border-2 border-outline surface overflow-hidden">
            <div className="grid grid-cols-2 border-b-2 border-outline">
              <button
                type="button"
                onClick={() => setSocialTab('following')}
                className={`py-3 text-xs font-black uppercase tracking-wider transition relative ${
                  socialTab === 'following' ? 'text-[#1c9ee0]' : 'ink-3'
                }`}
              >
                FOLLOWING
                {socialTab === 'following' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1c9ee0]" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setSocialTab('followers')}
                className={`py-3 text-xs font-black uppercase tracking-wider transition relative ${
                  socialTab === 'followers' ? 'text-[#1c9ee0]' : 'ink-3'
                }`}
              >
                FOLLOWERS
                {socialTab === 'followers' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1c9ee0]" />
                )}
              </button>
            </div>
            <div className="px-6 pt-4 pb-2 flex justify-center">
              <img
                src="https://d35aaqx5ub95lt.cloudfront.net/images/profile/a925a18c6be921a81bf0e13102983168.svg"
                alt="Learners connecting with friends"
                className="w-full max-w-[200px] object-contain"
              />
            </div>
            <p className="text-center px-6 pb-5 text-[11px] font-bold ink-3 leading-relaxed">
              Learning is more fun and effective when you connect with others.
            </p>
          </div>

          {/* Add Friends */}
          <div className="rounded-2xl border-2 border-outline surface overflow-hidden">
            <div className="px-4 pt-4 pb-0">
              <h3 className="text-sm font-black ink mb-0">Add friends</h3>
            </div>
            <div className="mt-3 border-t-2 border-outline">
              <FriendAction
                icon={
                  <div className="w-8 h-8 rounded-full bg-[#f0f0f0] dark:bg-white/10 flex items-center justify-center">
                    <Search size={15} className="text-[#afafaf]" />
                  </div>
                }
                label="Find friends"
              />
              <FriendAction
                icon={
                  <div className="w-8 h-8 rounded-full bg-[#d7ffb8] dark:bg-[#58cc02]/20 flex items-center justify-center">
                    <span className="text-base">🦉</span>
                  </div>
                }
                label="Invite friends"
                borderTop
              />
            </div>
          </div>

          {/* Footer links */}
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 px-2 text-[10px] font-black uppercase tracking-wider ink-3">
            {['About', 'Blog', 'Store', 'Efficacy', 'Careers', 'Investors', 'Terms', 'Privacy'].map(l => (
              <span key={l} className="hover:underline cursor-pointer">{l}</span>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

/* Sub-components */

function AvatarMark({ avatar, large = false }: { avatar: string; large?: boolean }) {
  const safe = avatar.startsWith('avatar-') ? avatar : 'avatar-sun'
  return (
    <span className={`avatar-mark ${safe} ${large ? 'is-large' : ''}`} aria-hidden="true">
      <span className="avatar-mark-eye left" />
      <span className="avatar-mark-eye right" />
      <span className="avatar-mark-smile" />
    </span>
  )
}

function StatCard({
  icon, value, label, bg, valueClass = '',
}: {
  icon: React.ReactNode
  value: string | number
  label: string
  bg: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center gap-3 border-2 border-outline rounded-2xl p-3 surface min-h-[72px]">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        {icon}
      </div>
      <div>
        <div className={`text-base font-black ink leading-none ${valueClass}`}>{value}</div>
        <div className="text-[11px] font-bold ink-3 mt-0.5 leading-tight">{label}</div>
      </div>
    </div>
  )
}

function TopMetric({ emoji, value, label }: { emoji: string; value: number; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1">
        <span className="text-lg leading-none">{emoji}</span>
        <span className="text-sm font-black ink">{value}</span>
      </div>
      {label && <span className="text-[9px] font-bold ink-3 uppercase tracking-wider">{label}</span>}
    </div>
  )
}

function AchievementRow({ achievement, index, userXp }: {
  achievement: Achievement
  index: number
  userXp: number
}) {
  const COLORS = ['#ff4b4b', '#58cc02', '#a560e8', '#1cb0f6', '#ff9600']
  const color = achievement.color || COLORS[index % COLORS.length]
  const target = Math.max(achievement.ruleValue || 1, 1)
  const pct = achievement.unlocked
    ? 100
    : Math.min(99, Math.round(((achievement.progress ?? userXp) / target) * 100))
  const displayProgress = `${achievement.unlocked ? target : achievement.progress ?? userXp}/${target}`

  return (
    <div className={`flex items-center gap-4 p-4 border-b-2 border-outline last:border-0 ${!achievement.unlocked ? 'opacity-80' : ''}`}>
      <div
        className="w-[60px] h-[60px] rounded-2xl flex items-center justify-center shrink-0 text-3xl relative overflow-hidden"
        style={{ background: `${color}22` }}
      >
        <span>{achievement.icon}</span>
        <div
          className="absolute bottom-0 left-0 right-0 text-[8px] font-black text-white text-center py-[2px] uppercase tracking-wider"
          style={{ background: color }}
        >
          LEVEL 1
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-black ink">{achievement.title}</span>
          <span className="text-[11px] font-bold ink-3 shrink-0">{displayProgress}</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden bg-outline mb-2">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <p className="text-[11px] font-bold ink-3 leading-tight">{achievement.description}</p>
      </div>
    </div>
  )
}

function FriendAction({ icon, label, borderTop }: { icon: React.ReactNode; label: string; borderTop?: boolean }) {
  return (
    <button
      type="button"
      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--surface-2)] transition text-left ${
        borderTop ? 'border-t-2 border-outline' : ''
      }`}
    >
      {icon}
      <span className="flex-1 text-sm font-black ink">{label}</span>
      <ChevronRight size={16} className="ink-3" />
    </button>
  )
}
