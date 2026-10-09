'use client'
import { useEffect, useState, useCallback } from 'react'
import Sidebar, { MobileNav } from '@/components/duo/Sidebar'
import TopBar from '@/components/duo/TopBar'
import SkillTree from '@/components/duo/SkillTree'
import LessonPlayer from '@/components/duo/LessonPlayer'
import LessonComplete from '@/components/duo/LessonComplete'
import HeartsModal from '@/components/duo/HeartsModal'
import Leaderboard from '@/components/duo/Leaderboard'
import Profile from '@/components/duo/Profile'
import Shop from '@/components/duo/Shop'
import Letters from '@/components/duo/Letters'
import RightRail from '@/components/duo/RightRail'
import { Toaster, toast } from 'sonner'
import { useTheme } from 'next-themes'
import type { User, Course, Lesson, LessonMode, LessonCompletion, AnswerResult, LeaderboardData, Achievement } from '@/lib/types'

const LEARNER_KEY = 'duo_learner_email'
const PROFILE_KEY = 'duo_learner_profile'
const WAKE_RETRIES = 8
const WAKE_DELAY_MS = 5000
const TRANSIENT_STATUSES = [502, 503, 504]

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function rememberProfile(learner: User) {
  if (!learner.email) return
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify({
    name: learner.name,
    email: learner.email,
    nativeLanguage: learner.nativeLanguage,
    targetLanguage: learner.targetLanguage,
    proficiencyLevel: learner.proficiencyLevel || 'Beginner',
    dailyGoal: learner.dailyGoal,
  }))
}

let restoring: Promise<boolean> | null = null

function restoreLearner(email: string | null): Promise<boolean> {
  if (restoring) return restoring
  restoring = (async () => {
    try {
      const profile = JSON.parse(window.localStorage.getItem(PROFILE_KEY) || 'null')
      if (!email || !profile || profile.email !== email) return false
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      if (res.ok) toast.info('Your learner data was reset on the server, so your progress starts fresh.')
      return res.ok
    } catch {
      return false
    } finally {
      setTimeout(() => { restoring = null }, 2000)
    }
  })()
  return restoring
}

async function api<T = any>(path: string, opts: RequestInit = {}, attempt = 0, restored = false): Promise<T> {
  const email = window.localStorage.getItem(LEARNER_KEY)
  const readOnly = (opts.method || 'GET').toUpperCase() === 'GET'
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(email ? { 'X-Learner-Email': email } : {}), ...(opts.headers || {}) },
    })
  } catch {
    if (readOnly && attempt < WAKE_RETRIES) {
      await sleep(WAKE_DELAY_MS)
      return api<T>(path, opts, attempt + 1, restored)
    }
    throw new Error('Cannot reach the server. Please try again.')
  }
  if (TRANSIENT_STATUSES.includes(res.status) && readOnly && attempt < WAKE_RETRIES) {
    await sleep(WAKE_DELAY_MS)
    return api<T>(path, opts, attempt + 1, restored)
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    if (res.status === 404 && err.code === 'learner_not_found') {
      if (!restored && await restoreLearner(email)) return api<T>(path, opts, attempt, true)
      window.localStorage.removeItem(LEARNER_KEY)
      window.location.replace('/')
    }
    throw new Error(err.detail || err.error || 'Request failed')
  }
  return res.json()
}

type View = 'learn' | 'letters' | 'leaderboard' | 'shop' | 'profile' | 'settings' | 'help'
type Mode = LessonMode

export default function Home() {
  const [view, setView] = useState<View>('learn')
  const [user, setUser] = useState<User | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [activeMode, setActiveMode] = useState<Mode>('lesson')
  const [completeResult, setCompleteResult] = useState<any | null>(null)
  const [heartsOpen, setHeartsOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  const loadUser = useCallback(async () => {
    const learner = await api<User>('/user')
    rememberProfile(learner)
    setUser(learner)
  }, [])
  const loadCourse = useCallback(async () => setCourse(await api<Course>('/course')), [])
  const loadLeaderboard = useCallback(async () => setLeaderboard(await api<LeaderboardData>('/leaderboard')), [])
  const loadAchievements = useCallback(async () => { const r = await api<{ achievements: Achievement[] }>('/achievements'); setAchievements(r.achievements) }, [])

  useEffect(() => { loadUser(); loadCourse(); loadAchievements() }, [loadUser, loadCourse, loadAchievements])
  useEffect(() => { if (view === 'leaderboard') loadLeaderboard() }, [view, loadLeaderboard])
  // Sync theme from user server preference on first load
  useEffect(() => { if (user?.theme && user.theme !== theme) setTheme(user.theme) }, [user?.theme])

  async function startLesson(lessonId: string, mode: Mode = 'lesson') {
    if (mode !== 'practice' && user!.hearts <= 0) { setHeartsOpen(true); return }
    try {
      const lesson = await api<Lesson>(`/lessons/${lessonId}/attempts`, { method: 'POST', body: JSON.stringify({ mode }) })
      setActiveLesson(lesson); setActiveMode(mode)
    } catch (e: any) {
      toast.error(e.message)
      loadUser(); loadCourse()
    }
  }

  async function answerExercise(exerciseId: string, answer: any): Promise<AnswerResult> {
    const res = await api<AnswerResult>(`/attempts/${activeLesson!.attemptId}/answers`, { method: 'POST', body: JSON.stringify({ exerciseId, answer }) })
    if (!res.correct && activeMode !== 'practice') setUser(u => u ? ({ ...u, hearts: res.hearts }) : u)
    return res
  }

  async function completeLesson() {
    if (!activeLesson) return
    try {
      const res = await api<LessonCompletion>(`/attempts/${activeLesson.attemptId}/complete`, { method: 'POST' })
      setUser(res.user)
      setActiveLesson(null)
      setCompleteResult({ mode: activeMode, xpEarned: res.xpEarned, mistakes: res.mistakes, timeSec: res.timeSec, newAchievements: res.newAchievements })
      if (res.newAchievements.length) toast.success(`🏆 New achievement unlocked!`)
    } catch (e: any) {
      toast.error(e.message)
      setActiveLesson(null)
      loadUser()
    }
    loadCourse(); loadAchievements()
  }

  async function refillHearts(method: string) {
    try {
      const res = await api<any>('/hearts/refill', { method: 'POST', body: JSON.stringify({ method }) })
      setUser(res.user)
      if (res.message) toast.info(res.message)
      else toast.success('Hearts refilled!')
      setHeartsOpen(false)
    } catch (e: any) { toast.error(e.message) }
  }

  async function updateUser(patch: any) {
    // Update theme locally too
    if (patch.theme) setTheme(patch.theme)
    const res = await api<User>('/user', { method: 'POST', body: JSON.stringify(patch) })
    setUser(res)
  }

  async function advanceDay() {
    await api('/dev/advance-day', { method: 'POST' })
    toast.success('Simulated next day — complete a lesson to grow streak')
    loadUser()
  }

  function logout() {
    window.localStorage.removeItem('duo_learner_email')
    window.localStorage.setItem('duo_logged_out', '1')
    window.sessionStorage.clear()
    window.location.replace('/')
  }

  return (
    <div className="min-h-screen surface">
      <Toaster position="top-center" richColors />
      <Sidebar view={view} setView={setView} onLogout={logout} />
      <MobileNav view={view} setView={setView} onLogout={logout} />

      <div className="md:pl-[260px]">
        <TopBar user={user} onHeartsClick={() => setHeartsOpen(true)} />
        <div className="flex justify-center max-w-7xl mx-auto">
          <main className="flex-1 px-4 md:px-6 py-8 min-w-0">
            {view === 'learn' && course && (
              <SkillTree course={course}
                onStartLesson={(id) => startLesson(id, 'lesson')}
                onStartPractice={(id) => startLesson(id, 'practice')}
                onStartLegendary={(id) => startLesson(id, 'legendary')} />
            )}
            {view === 'letters' && <Letters targetLanguage={user?.targetLanguage || user?.language} />}
            {view === 'leaderboard' && leaderboard && (<Leaderboard data={leaderboard} user={user} />)}
            {view === 'profile' && user && (<Profile user={user} onUpdate={updateUser} achievements={achievements} />)}
            {view === 'shop' && user && (<Shop user={user} onRefill={refillHearts} />)}
            {view === 'settings' && <SettingsView theme={theme} onThemeChange={(next) => { setTheme(next); updateUser({ theme: next }) }} />}
            {view === 'help' && <HelpView />}
          </main>

          {['learn', 'letters', 'leaderboard'].includes(view) && (
            <RightRail user={user} onNavigate={setView} />
          )}
        </div>
      </div>

      {activeLesson && user && (
        <LessonPlayer lesson={activeLesson} user={user} mode={activeMode}
          onAnswer={answerExercise} onComplete={completeLesson}
          onQuit={() => setActiveLesson(null)} />
      )}
      {completeResult && (<LessonComplete result={completeResult} onContinue={() => setCompleteResult(null)} />)}
      <HeartsModal open={heartsOpen} user={user} onClose={() => setHeartsOpen(false)} onRefill={refillHearts} />
    </div>
  )
}

function SettingsView({ theme, onThemeChange }: { theme?: string; onThemeChange: (theme: 'light' | 'dark') => void }) {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-black mb-8 ink">Preferences</h1>
      <h2 className="settings-heading">Lesson experience</h2>
      <div className="settings-list">
        {['Sound effects', 'Animations', 'Motivational messages', 'Listening exercises'].map(item => (
          <div className="settings-row" key={item}><span>{item}</span><span className="settings-toggle">ON</span></div>
        ))}
      </div>
      <h2 className="settings-heading mt-10">Appearance</h2>
      <div className="settings-row settings-theme-row">
        <span>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
        <select value={theme === 'dark' ? 'dark' : 'light'} onChange={e => onThemeChange(e.target.value as 'light' | 'dark')} aria-label="Theme">
          <option value="light">LIGHT MODE</option>
          <option value="dark">DARK MODE</option>
        </select>
      </div>
    </div>
  )
}

function HelpView() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="surface rounded-3xl border-2 border-outline overflow-hidden mb-8">
        <div className="bg-duo-blue/10 dark:bg-duo-blue/20 px-6 md:px-10 pt-8 flex items-center justify-between gap-6">
          <div className="pb-8">
            <p className="text-xs font-black uppercase tracking-widest text-duo-blue mb-2">Support centre</p>
            <h1 className="text-3xl md:text-4xl font-black ink mb-3">How can we help?</h1>
            <p className="ink-2 font-bold">Find answers and keep your learning streak moving.</p>
          </div>
          <img
            src="https://dy8n3onijof8f.cloudfront.net/static/images/wp/716d136653016193e783.svg"
            alt="Duolingo learner mascot"
            className="hidden sm:block w-32 h-32 object-contain self-end"
          />
        </div>
        <div className="p-6 md:p-8">
          <input
            className="w-full surface-2 border-2 border-outline rounded-2xl px-5 py-4 ink font-bold focus:outline-none focus:border-duo-blue"
            placeholder="Search help articles"
            aria-label="Search help articles"
          />
        </div>
      </div>
      <h2 className="text-xl font-black ink mb-4">Browse help topics</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {['Getting started', 'Lessons and progress', 'Account and settings', 'Frequently asked questions'].map(item => (
          <button key={item} type="button" className="surface border-2 border-outline rounded-2xl p-5 text-left font-black ink hover:border-duo-blue transition">
            {item}<span className="block text-sm ink-3 font-normal mt-2">Coming soon</span>
          </button>
        ))}
      </div>
    </div>
  )
}
