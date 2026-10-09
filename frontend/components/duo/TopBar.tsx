'use client'
import type { User } from '@/lib/types'
import { getLanguageName } from '@/lib/language'

function DuoFlag({ language }: { language?: string | null }) {
  const code = (language || '').toLowerCase()
  if (code.includes('hi') || code.includes('hindi')) {
    return (
      <svg width="28" height="20" viewBox="0 0 28 20" className="rounded-[4px] shadow-sm border border-black/10 overflow-hidden">
        <rect width="28" height="6.67" fill="#FF9933" />
        <rect y="6.67" width="28" height="6.67" fill="#FFFFFF" />
        <rect y="13.33" width="28" height="6.67" fill="#138808" />
        <circle cx="14" cy="10" r="2.4" fill="none" stroke="#000080" strokeWidth="0.8" />
      </svg>
    )
  }
  if (code.includes('fr') || code.includes('french')) {
    return (
      <svg width="28" height="20" viewBox="0 0 28 20" className="rounded-[4px] shadow-sm border border-black/10 overflow-hidden">
        <rect width="9.33" height="20" fill="#002395" />
        <rect x="9.33" width="9.33" height="20" fill="#FFFFFF" />
        <rect x="18.66" width="9.34" height="20" fill="#ED2939" />
      </svg>
    )
  }
  // Spanish default
  return (
    <svg width="28" height="20" viewBox="0 0 28 20" className="rounded-[4px] shadow-sm border border-black/10 overflow-hidden">
      <rect width="28" height="5" fill="#AA151B" />
      <rect y="5" width="28" height="10" fill="#F1BF00" />
      <rect y="15" width="28" height="5" fill="#AA151B" />
    </svg>
  )
}

function DuoFlameIcon({ active = true }: { active?: boolean }) {
  if (!active) {
    return (
      <svg width="24" height="26" viewBox="0 0 28 32" fill="none" className="shrink-0">
        <path
          d="M14.5 2C14.5 2 17 6.5 17 9.5C17 10.7 16.5 11.8 15.7 12.6C15.6 10.2 14.1 8 12.2 6.5C10.3 10.2 9.5 14.4 10 18.5C8.8 17.5 8 16 8 14.2C5.5 17.5 4 21.6 4 25C4 28.9 7.1 32 14 32C20.9 32 24 27.5 24 21C24 13.5 14.5 2 14.5 2Z"
          fill="#afafaf"
        />
      </svg>
    )
  }
  return (
    <svg width="24" height="26" viewBox="0 0 28 32" fill="none" className="shrink-0 drop-shadow-xs">
      {/* Outer flame */}
      <path
        d="M14.5 1C14.5 1 17.5 6 17.5 9.5C17.5 11 16.8 12.2 15.8 13C15.7 10.5 14.2 8.2 12.2 6.5C10.2 10.2 9.5 14.5 10 18.5C8.8 17.5 8 16 8 14.2C5.5 17.5 4 21.6 4 25C4 28.9 7.1 31 14 31C20.9 31 24 27.5 24 21C24 13.5 14.5 1 14.5 1Z"
        fill="#ff9600"
      />
      {/* Inner flame */}
      <path
        d="M14 13C14 13 16 16.5 16 18.5C16 19.5 15.5 20.3 14.8 20.8C14.7 19.2 13.8 17.8 12.5 16.8C11.5 19 11 21.5 11.2 24C10.5 23.3 10 22.3 10 21.2C9 23 8.5 25 8.5 26.5C8.5 28.5 10 29.5 14 29.5C18 29.5 19.5 27.5 19.5 24C19.5 19.5 14 13 14 13Z"
        fill="#ffc800"
      />
    </svg>
  )
}

function DuoGemIcon() {
  return (
    <svg width="26" height="24" viewBox="0 0 32 28" fill="none" className="shrink-0 drop-shadow-xs">
      <polygon points="10,2 22,2 27,9 5,9" fill="#84d8ff" />
      <polygon points="10,2 5,9 2,9 6,2" fill="#40c4ff" />
      <polygon points="22,2 27,9 30,9 26,2" fill="#1cb0f6" />
      <polygon points="5,9 16,26 12,9" fill="#1cb0f6" />
      <polygon points="12,9 16,26 20,9" fill="#009fe3" />
      <polygon points="20,9 16,26 27,9" fill="#1482c2" />
      <polygon points="2,9 5,9 16,26" fill="#40c4ff" />
      <polygon points="27,9 30,9 16,26" fill="#0d679b" />
    </svg>
  )
}

function DuoHeartIcon({ active = true }: { active?: boolean }) {
  if (!active) {
    return (
      <svg width="25" height="23" viewBox="0 0 28 26" fill="none" className="shrink-0">
        <path
          d="M14 24C14 24 2 16.5 2 8C2 3.8 5.3 1 9.5 1C11.8 1 13.2 2.2 14 3.2C14.8 2.2 16.2 1 18.5 1C22.7 1 26 3.8 26 8C26 16.5 14 24 14 24Z"
          fill="#afafaf"
        />
      </svg>
    )
  }
  return (
    <svg width="25" height="23" viewBox="0 0 28 26" fill="none" className="shrink-0 drop-shadow-xs">
      <path
        d="M14 24C14 24 2 16.5 2 8C2 3.8 5.3 1 9.5 1C11.8 1 13.2 2.2 14 3.2C14.8 2.2 16.2 1 18.5 1C22.7 1 26 3.8 26 8C26 16.5 14 24 14 24Z"
        fill="#ff4b4b"
      />
      <path
        d="M6 7C6 5 7.5 3.5 10 3.5C11 3.5 12 4 12.5 4.8C12 4.2 11.2 3.8 10 3.8C7.8 3.8 6.5 5 6.5 7C6.5 8 7 9 7.8 9.8C7 9 6 8.2 6 7Z"
        fill="#ff8585"
      />
      <circle cx="8" cy="6" r="1.5" fill="white" opacity="0.6" />
    </svg>
  )
}

export default function TopBar({ user, onHeartsClick }: { user: User | null; onHeartsClick: () => void }) {
  if (!user) return null
  return (
    <div className="sticky top-0 z-30 surface border-b-2 border-outline">
      <div className="max-w-5xl mx-auto flex items-center justify-end gap-2 sm:gap-4 px-4 py-2.5">
        {/* Language Flag Badge */}
        <button
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer select-none"
          title={getLanguageName(user.targetLanguage || user.language)}
        >
          <DuoFlag language={user.targetLanguage || user.language} />
        </button>

        {/* Streak Flame */}
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer select-none"
          title={`${user.streak} day streak`}
        >
          <DuoFlameIcon active={user.streak > 0} />
          <span className={`font-black text-base ${user.streak > 0 ? 'text-[#ff9600]' : 'text-[#afafaf]'}`}>
            {user.streak || 0}
          </span>
        </div>

        {/* Gems Diamond */}
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer select-none"
          title={`${user.gems || 0} gems`}
        >
          <DuoGemIcon />
          <span className="font-black text-base text-[#1cb0f6]">
            {user.gems || 0}
          </span>
        </div>

        {/* Hearts */}
        <button
          onClick={onHeartsClick}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer select-none"
          title={`${user.hearts} hearts`}
        >
          <DuoHeartIcon active={user.hearts > 0} />
          <span className={`font-black text-base ${user.hearts > 0 ? 'text-[#ff4b4b]' : 'text-[#afafaf]'}`}>
            {user.hearts}
          </span>
        </button>
      </div>
    </div>
  )
}
