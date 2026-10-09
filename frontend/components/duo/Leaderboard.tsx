'use client'
import type { LeaderboardData, User } from '@/lib/types'

const RANK_MEDALS = ['🥇', '🥈', '🥉']
const PALETTE = ['avatar-sun', 'avatar-sky', 'avatar-coral', 'avatar-leaf', 'avatar-lilac', 'avatar-citrus', 'avatar-ocean', 'avatar-rose', 'avatar-amber', 'avatar-moon']
const PROMOTION_ZONE_SIZE = 3

function paletteFor(seed: string) {
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % PALETTE.length
  return PALETTE[hash]
}

function Avatar({ avatar, name }: { avatar: string; name: string }) {
  if (avatar.startsWith('avatar-')) {
    return (
      <span className={`avatar-mark ${avatar} shrink-0`} aria-hidden="true">
        <span className="avatar-mark-eye left" />
        <span className="avatar-mark-eye right" />
        <span className="avatar-mark-smile" />
      </span>
    )
  }
  return (
    <span
      className={`${paletteFor(avatar)} w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-base font-black text-white`}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

export default function Leaderboard({ data, user }: { data: LeaderboardData; user: User | null }) {
  if (!data) return null
  return (
    <div className="max-w-xl mx-auto pb-24">
      <div className="text-center mb-5">
        <div className="flex justify-center mb-2">
          <img
            src="https://d35aaqx5ub95lt.cloudfront.net/images/leagues/660a07cd535396f03982f24bd0c3844a.svg"
            alt="League Trophy"
            className="w-24 h-24 object-contain"
          />
        </div>
        <div className="text-2xl font-black ink">{data.league} League</div>
        <div className="ink-3 text-sm font-bold">Top {PROMOTION_ZONE_SIZE} advance next week</div>
      </div>
      <div className="flex flex-col">
        {data.users.map((u, i) => {
          const rank = u.rank ?? i + 1
          const isMe = u.id === user?.id || u.isMe
          const previous = data.users[i - 1]
          const showZoneDivider = previous && (previous.rank ?? i) <= PROMOTION_ZONE_SIZE && rank > PROMOTION_ZONE_SIZE
          return (
            <div key={u.id}>
              {showZoneDivider && (
                <div className="flex items-center gap-3 my-2 text-[11px] font-black uppercase tracking-widest text-duo-green">
                  <span className="flex-1 h-px bg-outline" />
                  <span>Promotion zone</span>
                  <span className="flex-1 h-px bg-outline" />
                </div>
              )}
              <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${isMe ? 'bg-duo-blue/10' : 'hover:bg-black/[0.03]'}`}>
                <div className="w-7 flex justify-center font-black text-base">
                  {rank <= 3 ? (
                    <span className="text-xl leading-none" title={`Rank ${rank}`}>{RANK_MEDALS[rank - 1]}</span>
                  ) : (
                    <span className="ink-3">{rank}</span>
                  )}
                </div>
                <Avatar avatar={u.avatar} name={u.name} />
                <div className="flex-1 min-w-0 font-bold text-[15px] ink truncate">
                  {u.name}{isMe && <span className="text-duo-blue ml-2 text-[10px] font-black tracking-wider">YOU</span>}
                </div>
                <div className="font-bold text-sm ink-2">{u.xp} XP</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
