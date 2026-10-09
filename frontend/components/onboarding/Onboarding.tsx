'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import DuoOwl from '@/components/duo/DuoOwl'

type Course = { name: string; code: string; flag: FlagCode }
type Goal = { minutes: number; label: string }
type FlagCode = 'india' | 'france' | 'spain' | 'united-kingdom' | 'united-states'

const courses: Course[] = [
  { name: 'Hindi', code: 'hi', flag: 'india' },
  { name: 'French', code: 'fr', flag: 'france' },
  { name: 'Spanish', code: 'es', flag: 'spain' },
]
const goals: Goal[] = [
  { minutes: 5, label: 'Casual' },
  { minutes: 10, label: 'Regular' },
  { minutes: 15, label: 'Serious' },
  { minutes: 20, label: 'Intense' },
]
const proficiencyLabels = [
  "I'm new to",
  'I know some common words',
  'I can have basic conversations',
  'I can talk about various topics',
  'I can discuss most topics in detail',
]

type State = {
  course: Course | null
  nativeLanguage: string
  proficiency: string
  goal: number
  name: string
  email: string
}

const initialState: State = {
  course: null,
  nativeLanguage: 'English',
  proficiency: '',
  goal: 10,
  name: '',
  email: '',
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.detail || 'Something went wrong')
  return data
}

function Header() {
  return (
    <header className="flex items-center justify-between px-5 py-5 md:px-10">
      <img
        src="https://d35aaqx5ub95lt.cloudfront.net/images/splash/f92d5f2f7d56636846861c458c0d0b6c.svg"
        alt="Duolingo"
        className="h-14 w-auto object-contain md:h-16"
      />
      <button className="text-xs font-black tracking-wide text-[#777] md:text-sm" type="button">
        SITE LANGUAGE: ENGLISH <span className="ml-1 text-base">⌄</span>
      </button>
    </header>
  )
}

function Progress({ step, onBack }: { step: number; onBack: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl items-center gap-4 px-5 pt-5 md:px-8">
      <button aria-label="Go back" className="text-3xl font-normal text-[#afafaf]" onClick={onBack} type="button">‹</button>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#e5e5e5]">
        <div className="h-full rounded-full bg-[#58cc02] transition-all duration-300" style={{ width: `${(step / 6) * 100}%` }} />
      </div>
    </div>
  )
}

function SelectCard({ selected, onClick, children, className = '' }: { selected: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      className={`option-card flex min-h-[72px] w-full items-center gap-4 text-left text-lg ${selected ? 'selected' : ''} ${className}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}

function ProficiencyBars({ level, selected }: { level: number; selected: boolean }) {
  return (
    <span className="proficiency-bars" aria-hidden="true">
      {[0, 1, 2, 3, 4].map(bar => (
        <span
          className={bar <= level ? (selected ? 'active' : 'filled') : ''}
          key={bar}
          style={{ height: `${10 + bar * 4}px` }}
        />
      ))}
    </span>
  )
}

function CountryFlag({ country }: { country: FlagCode }) {
  const label = {
    india: 'India',
    france: 'France',
    spain: 'Spain',
    'united-kingdom': 'United Kingdom',
    'united-states': 'United States',
  }[country]

  return (
    <svg
      aria-label={`${label} flag`}
      className="h-8 w-11 shrink-0 overflow-hidden rounded-lg border border-black/10 shadow-sm"
      role="img"
      viewBox="0 0 44 32"
    >
      {country === 'india' && (
        <>
          <rect width="44" height="10.67" fill="#ff9933" />
          <rect y="10.67" width="44" height="10.67" fill="#fff" />
          <rect y="21.34" width="44" height="10.66" fill="#138808" />
          <circle cx="22" cy="16" r="3.5" fill="none" stroke="#000080" strokeWidth="1" />
          <circle cx="22" cy="16" r="0.8" fill="#000080" />
        </>
      )}
      {country === 'france' && (
        <>
          <rect width="14.67" height="32" fill="#0055a4" />
          <rect x="14.67" width="14.66" height="32" fill="#fff" />
          <rect x="29.33" width="14.67" height="32" fill="#ef4135" />
        </>
      )}
      {country === 'spain' && (
        <>
          <rect width="44" height="7" fill="#aa151b" />
          <rect y="7" width="44" height="18" fill="#f1bf00" />
          <rect y="25" width="44" height="7" fill="#aa151b" />
        </>
      )}
      {country === 'united-states' && (
        <>
          <rect width="44" height="32" fill="#fff" />
          {[0, 4.92, 9.84, 14.76, 19.68, 24.6, 29.52].map(y => (
            <rect key={y} y={y} width="44" height="2.46" fill="#b22234" />
          ))}
          <rect width="19" height="17.23" fill="#3c3b6e" />
          <circle cx="4" cy="4" r="1" fill="#fff" />
          <circle cx="9.5" cy="4" r="1" fill="#fff" />
          <circle cx="15" cy="4" r="1" fill="#fff" />
          <circle cx="6.75" cy="8.6" r="1" fill="#fff" />
          <circle cx="12.25" cy="8.6" r="1" fill="#fff" />
          <circle cx="4" cy="13.2" r="1" fill="#fff" />
          <circle cx="9.5" cy="13.2" r="1" fill="#fff" />
          <circle cx="15" cy="13.2" r="1" fill="#fff" />
        </>
      )}
      {country === 'united-kingdom' && (
        <>
          <rect width="44" height="32" fill="#012169" />
          <path d="M0 0L44 32M44 0L0 32" stroke="#fff" strokeWidth="7" />
          <path d="M0 0L44 32M44 0L0 32" stroke="#c8102e" strokeWidth="3" />
          <path d="M22 0V32M0 16H44" stroke="#fff" strokeWidth="11" />
          <path d="M22 0V32M0 16H44" stroke="#c8102e" strokeWidth="6" />
        </>
      )}
    </svg>
  )
}

export default function Onboarding() {
  const router = useRouter()
  const [screen, setScreen] = useState<'landing' | 'flow' | 'return'>('landing')
  const [step, setStep] = useState(0)
  const [state, setState] = useState<State>(initialState)
  const [returnEmail, setReturnEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const selectedCourse = state.course

  useEffect(() => {
    fetch('/api/health').catch(() => {})
  }, [])

  useEffect(() => {
    if (window.localStorage.getItem('duo_logged_out') === '1') return
    const savedEmail = window.localStorage.getItem('duo_learner_email')
    if (savedEmail) {
      api(`/user/by-email?email=${encodeURIComponent(savedEmail)}`)
        .then(() => {
          window.location.replace('/learn')
        })
        .catch(() => window.localStorage.removeItem('duo_learner_email'))
    }
  }, [router])

  const question = useMemo(() => {
    if (!selectedCourse) return ''
    return `How much ${selectedCourse.name} do you know?`
  }, [selectedCourse])

  function start() {
    window.localStorage.removeItem('duo_logged_out')
    setError('')
    setScreen('flow')
    setStep(0)
  }

  function back() {
    setError('')
    if (step === 0) setScreen('landing')
    else setStep(step - 1)
  }

  function canContinue() {
    if (step === 0) return Boolean(state.course)
    if (step === 2) return Boolean(state.proficiency)
    if (step === 4) return state.name.trim().length >= 2
    if (step === 5) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim())
    return true
  }

  async function finish() {
    if (!canContinue() || !state.course) return
    setLoading(true)
    setError('')
    const normalizedEmail = state.email.trim().toLowerCase()
    try {
      // 1. Check if learner account already exists
      let existingUser = null
      try {
        existingUser = await api(`/user/by-email?email=${encodeURIComponent(normalizedEmail)}`)
      } catch {
        // User not found, will proceed to create
        existingUser = null
      }

      if (!existingUser) {
        // 2. New learner: save onboarding profile
        await api('/onboarding', {
          method: 'POST',
          body: JSON.stringify({
            name: state.name.trim(),
            email: normalizedEmail,
            nativeLanguage: state.nativeLanguage,
            targetLanguage: state.course.name,
            proficiencyLevel: state.proficiency,
            dailyGoal: state.goal,
          }),
        })
      }

      window.localStorage.removeItem('duo_logged_out')
      window.localStorage.setItem('duo_learner_email', normalizedEmail)
      window.location.replace('/learn')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your learner profile')
      setLoading(false)
    }
  }

  async function returnUser() {
    if (!returnEmail.trim()) return
    setLoading(true)
    setError('')
    try {
      await api(`/user/by-email?email=${encodeURIComponent(returnEmail.trim())}`)
      window.localStorage.removeItem('duo_logged_out')
      window.localStorage.setItem('duo_learner_email', returnEmail.trim().toLowerCase())
      window.location.replace('/learn')
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't find that account")
      setLoading(false)
    }
  }

  if (screen === 'landing') {
    return (
      <main className="min-h-screen bg-white text-[#4b4b4b]">
        <Header />
        <section className="mx-auto flex min-h-[calc(100vh-150px)] max-w-6xl flex-col items-center justify-center gap-10 px-6 py-10 md:flex-row md:gap-20">
          <div className="rounded-[40%] bg-[#f4fbef] p-12 md:p-16"><DuoOwl size={220} emotion="happy" /></div>
          <div className="w-full max-w-[430px] text-center">
            <h1 className="mb-8 text-3xl font-black leading-tight md:text-4xl">The most fun way to learn languages, chess and more!</h1>
            <button className="duo-btn duo-btn-green mb-5 h-14 w-full text-sm" onClick={start} type="button">Get started</button>
            <button className="duo-btn duo-btn-white h-14 w-full text-sm text-[#1cb0f6]" onClick={() => { setError(''); setScreen('return') }} type="button">I already have an account</button>
          </div>
        </section>
        <div className="flex flex-wrap items-center justify-center gap-5 border-t-2 border-[#f0f0f0] px-5 py-5 text-sm font-black uppercase tracking-wider text-[#777]">
          {[
            ['united-kingdom', 'English'],
            ['india', 'Hindi'],
            ['france', 'French'],
            ['spain', 'Spanish'],
          ].map(([country, language], index) => (
            <span className="flex items-center gap-2" key={language}>
              {index > 0 && <span aria-hidden="true" className="mr-3 text-[#afafaf]">·</span>}
              <CountryFlag country={country as FlagCode} />
              <span>{language}</span>
            </span>
          ))}
        </div>
      </main>
    )
  }

  if (screen === 'return') {
    return (
      <main className="min-h-screen bg-white text-[#4b4b4b]">
        <Header />
        <section className="mx-auto flex max-w-lg flex-col items-center px-6 pt-16 text-center">
          <DuoOwl size={120} emotion="happy" />
          <h1 className="mt-8 text-3xl font-black">Welcome back!</h1>
          <p className="mt-3 text-[#777]">Enter your email to restore your learning progress.</p>
          <input autoFocus className="mt-8 h-14 w-full rounded-2xl border-2 border-[#e5e5e5] px-4 text-lg outline-none focus:border-[#1cb0f6]" onChange={e => setReturnEmail(e.target.value)} placeholder="Enter your email" type="email" value={returnEmail} />
          {error && <p className="mt-4 text-sm font-bold text-[#d93025]">{error}</p>}
          <button className="duo-btn duo-btn-green mt-6 h-14 w-full" disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(returnEmail)} onClick={returnUser} type="button">{loading ? 'Loading...' : 'Continue'}</button>
          <button className="mt-6 font-black uppercase tracking-wide text-[#1cb0f6]" onClick={start} type="button">Get started instead</button>
        </section>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col bg-white text-[#4b4b4b]">
      <Progress step={step + 1} onBack={back} />
      <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pb-28 pt-12 md:px-8">
        <div className="mb-8 flex items-center gap-4"><DuoOwl size={76} emotion={step === 5 ? 'cheer' : 'happy'} /><h1 className="text-2xl font-black md:text-3xl">{step === 0 ? 'Which language do you want to learn?' : step === 1 ? 'What language do you speak?' : step === 2 ? question : step === 3 ? 'How much do you want to practice?' : step === 4 ? 'What should we call you?' : "What's your email?"}</h1></div>
        {step === 0 && <div className="space-y-4">{courses.map(course => <SelectCard key={course.code} selected={state.course?.code === course.code} onClick={() => setState(s => ({ ...s, course }))}><CountryFlag country={course.flag} /><span><strong>{course.name}</strong><small className="block text-sm font-semibold text-[#777]">Choose a language to start learning</small></span></SelectCard>)}</div>}
        {step === 1 && <SelectCard selected onClick={() => setState(s => ({ ...s, nativeLanguage: 'English' }))}><CountryFlag country="united-states" /><strong>English</strong></SelectCard>}
        {step === 2 && <div className="space-y-4">{proficiencyLabels.map((label, index) => { const value = `${label} ${selectedCourse?.name}`; const selected = state.proficiency === value; return <SelectCard className="proficiency-card" key={value} selected={selected} onClick={() => setState(s => ({ ...s, proficiency: value }))}><ProficiencyBars level={index} selected={selected} /><strong className="proficiency-label">{value}</strong></SelectCard> })}</div>}
        {step === 3 && <div className="space-y-4">{goals.map(goal => <SelectCard key={goal.minutes} selected={state.goal === goal.minutes} onClick={() => setState(s => ({ ...s, goal: goal.minutes }))}><strong>{goal.minutes} min / day</strong><span className="ml-auto text-[#777]">{goal.label}</span></SelectCard>)}</div>}
        {step === 4 && <input autoFocus className="h-16 rounded-2xl border-2 border-[#e5e5e5] px-5 text-xl outline-none focus:border-[#1cb0f6]" onChange={e => setState(s => ({ ...s, name: e.target.value }))} placeholder="Name" type="text" value={state.name} />}
        {step === 5 && <><input autoFocus className="h-16 rounded-2xl border-2 border-[#e5e5e5] px-5 text-xl outline-none focus:border-[#1cb0f6]" onChange={e => setState(s => ({ ...s, email: e.target.value }))} placeholder="Email" type="email" value={state.email} /><p className="mt-3 text-sm text-[#777]">We'll use this to save your learning progress.</p></>}
        {error && <p className="mt-5 text-sm font-bold text-[#d93025]">{error}</p>}
      </section>
      <div className="fixed bottom-0 left-0 right-0 border-t-2 border-[#f0f0f0] bg-white/95 px-5 py-5 text-right backdrop-blur">
        <button className="duo-btn duo-btn-green h-14 w-full max-w-xs text-sm" disabled={!canContinue() || loading} onClick={() => step === 5 ? finish() : setStep(step + 1)} type="button">{loading ? 'Saving...' : 'Continue'}</button>
      </div>
    </main>
  )
}
