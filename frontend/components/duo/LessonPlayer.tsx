'use client'
import { useState, useEffect, useMemo } from 'react'
import { X, Heart, Volume2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { AnswerResult, Lesson, ExerciseBase } from '@/lib/types'

// ---------- TTS helper (Web Speech API — free, no key) ----------
function speak(text: string, lang = 'es-ES') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang; u.rate = 0.9
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch {}
}

function SpeakerBtn({ text, lang = 'es-ES', large }: { text: string; lang?: string; large?: boolean }) {
  return (
    <button onClick={() => speak(text, lang)} title="Play audio"
      className={cn('inline-flex items-center justify-center rounded-xl text-white bg-duo-blue hover:bg-duo-blue-dark transition', large ? 'w-10 h-10' : 'w-8 h-8')}>
      <Volume2 className={large ? 'w-5 h-5' : 'w-4 h-4'} />
    </button>
  )
}

// ---------- Exercise Renderers ----------
function MultipleChoice({ exercise, selected, setSelected, disabled, speechLanguage }: any) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-xs font-black uppercase tracking-wider text-duo-purple">
        <span className="w-2 h-2 rounded-full bg-duo-purple animate-pulse" />
        New Word
      </div>
      <h2 className="text-2xl sm:text-3xl font-black mb-8 ink">{exercise.prompt}</h2>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {exercise.options.map((opt: any, i: number) => {
          const isSelected = selected === opt.text
          return (
            <button
              key={i}
              disabled={disabled}
              onClick={() => {
                setSelected(opt.text)
                speak(opt.text, speechLanguage)
              }}
              type="button"
              className={cn(
                'option-card flex flex-col items-center justify-between p-4 sm:p-5 text-center min-h-[170px] sm:min-h-[200px] rounded-2xl border-2 transition-all relative surface select-none',
                isSelected
                  ? 'border-[#1cb0f6] bg-[#1cb0f6]/5 shadow-[0_4px_0_#1cb0f6] text-[#1cb0f6]'
                  : 'border-outline hover:border-[#1cb0f6] shadow-[0_4px_0_var(--shadow-outline)]'
              )}
            >
              <div className="text-5xl sm:text-6xl my-auto py-2 transform transition-transform group-hover:scale-105">
                {opt.img}
              </div>
              <div className="w-full flex items-center justify-between pt-3 border-t border-outline/40">
                <span className="font-bold text-base sm:text-lg ink text-left">{opt.text}</span>
                <span className="text-xs font-black text-[#999] border border-outline rounded-lg px-2 py-0.5 ml-2">
                  {i + 1}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TranslateWordBank({ exercise, answer, setAnswer, disabled, speechLanguage }: any) {
  const placed = answer.placed, used = answer.used
  const addWord = (word: string, srcIdx: number) => { if (disabled) return; setAnswer({ placed: [...placed, { word, srcIdx }], used: [...used, srcIdx] }) }
  const removeWord = (idx: number) => {
    if (disabled) return
    const removed = placed[idx]
    setAnswer({ placed: placed.filter((_: any, i: number) => i !== idx), used: used.filter((u: number) => u !== removed.srcIdx) })
  }
  const isTargetScript = /[\u0900-\u097F]/.test(exercise.prompt) || exercise.prompt.toLowerCase() !== exercise.correctAnswer?.toLowerCase?.()
  const promptLang = isTargetScript ? speechLanguage : 'en-US'

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-black mb-6 ink">Write this in English</h2>
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-[#1cb0f6]/10 border-2 border-[#1cb0f6]/30 flex items-center justify-center text-3xl shrink-0">
          👳
        </div>
        <div className="surface rounded-2xl px-5 py-4 flex-1 font-bold text-xl border-2 border-outline ink flex items-center gap-3 relative shadow-sm">
          <button
            onClick={() => speak(exercise.prompt, promptLang)}
            className="w-9 h-9 rounded-xl bg-duo-blue text-white flex items-center justify-center hover:bg-duo-blue-dark transition shrink-0"
            type="button"
            title="Hear pronunciation"
          >
            <Volume2 className="w-5 h-5" />
          </button>
          <span className="underline decoration-dotted decoration-[#bbb] underline-offset-4">{exercise.prompt}</span>
        </div>
      </div>
      <div className="border-b-2 border-outline min-h-[64px] mb-8 pb-3 flex flex-wrap gap-2.5 items-center">
        {placed.map((p: any, i: number) => (
          <button key={i} onClick={() => removeWord(i)} className="word-chip placed text-base font-bold px-4 py-2.5 rounded-xl border-2 border-outline bg-surface surface ink shadow-[0_2px_0_var(--shadow-outline)]">{p.word}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2.5 justify-center">
        {exercise.wordBank.map((w: string, i: number) => (
          <button key={i} onClick={() => addWord(w, i)} disabled={disabled || used.includes(i)}
            className={cn('word-chip text-base font-bold px-4 py-2.5 rounded-xl border-2 transition-all', used.includes(i) ? 'bg-[#e5e5e5] text-transparent border-transparent' : 'surface ink border-outline hover:border-[#1cb0f6] shadow-[0_3px_0_var(--shadow-outline)]')}>{w}</button>
        ))}
      </div>
    </div>
  )
}

function FillBlank({ exercise, selected, setSelected, disabled, speechLanguage }: any) {
  const parts = exercise.sentence.split('___')
  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-black mb-6 ink flex items-center gap-2">Fill in the blank <SpeakerBtn text={exercise.sentence.replace('___', selected || '____')} lang={speechLanguage} /></h2>
      <div className="text-2xl font-bold mb-4 flex flex-wrap items-center gap-2 ink">
        <span>{parts[0]}</span>
        <span className={cn('inline-block min-w-[100px] border-b-4 pb-1 text-center font-black', selected ? 'border-duo-blue text-duo-blue' : 'border-outline text-transparent')}>
          {selected || 'blank'}
        </span>
        <span>{parts[1]}</span>
      </div>
      {exercise.translation && <div className="ink-3 text-sm mb-6 italic">{exercise.translation}</div>}
      <div className="grid grid-cols-3 gap-3 mt-6">
        {exercise.options.map((o: string, i: number) => (
          <button key={i} onClick={() => { setSelected(o); speak(o, speechLanguage) }} disabled={disabled} className={cn('option-card py-4 text-lg font-bold rounded-2xl border-2', selected === o ? 'border-duo-blue bg-duo-blue/5 shadow-[0_3px_0_#1cb0f6] text-duo-blue' : 'border-outline hover:border-duo-blue shadow-[0_3px_0_var(--shadow-outline)]')}>{o}</button>
        ))}
      </div>
    </div>
  )
}

function TypeAnswer({ exercise, answer, setAnswer, disabled }: any) {
  return (
    <div>
      <h2 className="text-2xl font-black mb-4 ink">{exercise.prompt}</h2>
      {exercise.hint && <div className="ink-3 text-sm mb-4 italic">Hint: {exercise.hint}</div>}
      <input value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={disabled} placeholder="Type your answer…"
        className="w-full text-xl font-bold border-2 border-outline surface ink rounded-2xl px-4 py-4 focus:outline-none focus:border-duo-blue" autoFocus />
    </div>
  )
}

function MatchPairs({ exercise, matches, setMatches, disabled, speechLanguage }: any) {
  const [pickedLeft, setPickedLeft] = useState<string | null>(null)
  const [pickedRight, setPickedRight] = useState<string | null>(null)
  const [correctSet, setCorrectSet] = useState<any[]>([])

  useEffect(() => {
    if (pickedLeft && pickedRight) {
      const newMatches = [...matches, { left: pickedLeft, right: pickedRight }]
      setMatches(newMatches)
      setCorrectSet(cs => [...cs, { left: pickedLeft, right: pickedRight }])
      setPickedLeft(null); setPickedRight(null)
    }
  }, [pickedLeft, pickedRight])

  const isUsedLeft = (l: string) => correctSet.find(c => c.left === l)
  const isUsedRight = (r: string) => correctSet.find(c => c.right === r)

  return (
    <div>
      <h2 className="text-2xl font-black mb-6 ink">Tap the matching pairs</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          {exercise.lefts.map((l: string) => (
            <button key={l} disabled={disabled || !!isUsedLeft(l)} onClick={() => { setPickedLeft(l); speak(l, speechLanguage) }}
              className={cn('option-card py-4', pickedLeft === l && 'selected', isUsedLeft(l) && 'correct disabled')}>{l}</button>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {exercise.rights.map((r: string) => (
            <button key={r} disabled={disabled || !!isUsedRight(r)} onClick={() => setPickedRight(r)}
              className={cn('option-card py-4', pickedRight === r && 'selected', isUsedRight(r) && 'correct disabled')}>{r}</button>
          ))}
        </div>
      </div>
      <div className="text-sm ink-3 mt-4 text-center">Matched {correctSet.length} / {exercise.pairsCount}</div>
    </div>
  )
}

// ---------- Feedback Bar ----------
function FeedbackBar({ result, exercise, onContinue }: any) {
  if (!result) return null
  const correct = result.correct
  return (
    <motion.div initial={{ y: 100 }} animate={{ y: 0 }}
      className={cn('fixed left-0 right-0 bottom-0 z-40', correct ? 'bg-duo-green/20 dark:bg-duo-green/10' : 'bg-duo-red/20 dark:bg-duo-red/10', 'border-t-2', correct ? 'border-duo-green' : 'border-duo-red')}>
      <div className="max-w-3xl mx-auto p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn('w-14 h-14 rounded-full flex items-center justify-center text-4xl bg-white')}>
              {correct ? '✅' : '❌'}
            </div>
            <div>
              <div className={cn('text-2xl font-black', correct ? 'text-duo-green-dark dark:text-duo-green' : 'text-duo-red-dark dark:text-duo-red')}>
                {correct ? 'Excellent!' : 'Correct answer:'}
              </div>
              {!correct && (
                <div className="font-bold text-duo-red-dark dark:text-duo-red">
                  {Array.isArray(result.correctAnswer)
                    ? result.correctAnswer.map((p: any) => `${p.left} → ${p.right}`).join(', ')
                    : result.correctAnswer}
                </div>
              )}
              {correct && exercise?.translation && (
                <div className="text-duo-green-dark dark:text-duo-green font-bold text-sm italic">{exercise.translation}</div>
              )}
            </div>
          </div>
          <button onClick={onContinue} className={cn('duo-btn text-white px-8 py-3', correct ? 'duo-btn-green' : 'duo-btn-red')}>Continue</button>
        </div>
      </div>
    </motion.div>
  )
}

// ---------- Main Player ----------
export default function LessonPlayer({ lesson, user, mode = 'lesson', onAnswer, onComplete, onQuit }: {
  lesson: Lesson; user: any; mode?: 'lesson' | 'practice' | 'legendary';
  onAnswer: (exerciseId: string, answer: any) => Promise<AnswerResult>;
  onComplete: () => void;
  onQuit: () => void;
}) {
  const speechLanguage = user?.targetLanguage === 'Hindi' ? 'hi-IN' : user?.targetLanguage === 'French' ? 'fr-FR' : 'es-ES'
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<any>(null)
  const [typed, setTyped] = useState('')
  const [wbAnswer, setWbAnswer] = useState<any>({ placed: [], used: [] })
  const [matches, setMatches] = useState<any[]>([])
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [hearts, setHearts] = useState(user?.hearts ?? 5)
  const [outOfHearts, setOutOfHearts] = useState(false)
  const [duoEmotion, setDuoEmotion] = useState<'idle' | 'happy' | 'sad' | 'cheer'>('idle')
  // Legendary mode: 60s per exercise timer
  const [timeLeft, setTimeLeft] = useState<number>(mode === 'legendary' ? 60 : 0)

  const total = lesson.exercises.length
  const exercise = lesson.exercises[index]

  useEffect(() => {
    setSelected(null); setTyped(''); setWbAnswer({ placed: [], used: [] }); setMatches([])
    setResult(null); setDuoEmotion('idle')
    if (mode === 'legendary') setTimeLeft(60)
    if (exercise?.type === 'translate_wordbank' && exercise.prompt) speak(exercise.prompt, 'en-US')
  }, [index, exercise?.type, exercise?.prompt])

  // Legendary countdown
  useEffect(() => {
    if (mode !== 'legendary' || result) return
    if (timeLeft <= 0) { handleCheck(true) as any; return }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, result, mode])

  const canCheck = useMemo(() => {
    if (!exercise) return false
    if (exercise.type === 'multiple_choice' || exercise.type === 'fill_blank') return !!selected
    if (exercise.type === 'type_answer') return typed.trim().length > 0
    if (exercise.type === 'translate_wordbank') return wbAnswer.placed.length > 0
    if (exercise.type === 'match_pairs') return matches.length === (exercise.pairsCount || 0)
    return false
  }, [exercise, selected, typed, wbAnswer, matches])

  async function handleCheck(auto = false) {
    let answer: any = null
    if (exercise.type === 'multiple_choice' || exercise.type === 'fill_blank') answer = selected
    else if (exercise.type === 'type_answer') answer = typed
    else if (exercise.type === 'translate_wordbank') answer = wbAnswer.placed.map((p: any) => p.word)
    else if (exercise.type === 'match_pairs') answer = matches
    if (auto && (answer === null || answer === '' || (Array.isArray(answer) && answer.length === 0))) answer = ''

    const res = await onAnswer(exercise.id, answer)
    setResult(res)
    if (res.correct) { setDuoEmotion('cheer'); setTimeout(() => setDuoEmotion('happy'), 700) }
    else {
      setDuoEmotion('sad'); setHearts(res.hearts)
      if (mode === 'practice') return // practice never ends on hearts
      if (res.hearts <= 0) setTimeout(() => setOutOfHearts(true), 1200)
    }
  }

  function handleContinue() {
    if (index + 1 >= total) {
      onComplete()
    } else {
      setIndex(i => i + 1)
    }
  }

  const progress = ((index + (result?.correct ? 1 : 0)) / total) * 100

  return (
    <div className="fixed inset-0 z-50 surface flex flex-col">
      <div className="flex items-center gap-4 px-4 md:px-8 py-4">
        <button onClick={onQuit} className="ink-3 hover:ink"><X className="w-7 h-7" strokeWidth={3} /></button>
        <div className="flex-1 h-4 bg-outline rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: mode === 'legendary' ? 'linear-gradient(180deg,#ce82ff,#a560e8)' : 'linear-gradient(180deg,#61e002 0%,#58cc02 100%)' }}>
            <div className="h-1/3 bg-white/40 rounded-full mx-1" />
          </div>
        </div>
        {mode === 'legendary' && (
          <div className={cn('font-black text-lg px-2 py-1 rounded', timeLeft <= 10 ? 'bg-duo-red text-white animate-pulse' : 'text-duo-purple')}>{timeLeft}s</div>
        )}
        {mode !== 'practice' && (
          <div className="flex items-center gap-1">
            <Heart className="w-6 h-6 fill-duo-red text-duo-red" />
            <span className="font-black text-lg text-duo-red">{hearts}</span>
          </div>
        )}
        {mode === 'practice' && <div className="text-xs font-black uppercase text-duo-green px-2 py-1 rounded bg-duo-green/10">Practice</div>}
        {mode === 'legendary' && <div className="text-xs font-black uppercase text-duo-purple px-2 py-1 rounded bg-duo-purple/10">Legendary</div>}
      </div>

      {/* Mascot */}
      <div className="hidden md:block fixed bottom-24 right-8 z-40">
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 md:p-8 pb-40">
          <AnimatePresence mode="wait">
            <motion.div key={index} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {exercise.type === 'multiple_choice' && <MultipleChoice exercise={exercise} selected={selected} setSelected={setSelected} disabled={!!result} speechLanguage={speechLanguage} />}
              {exercise.type === 'translate_wordbank' && <TranslateWordBank exercise={exercise} answer={wbAnswer} setAnswer={setWbAnswer} disabled={!!result} speechLanguage={speechLanguage} />}
              {exercise.type === 'fill_blank' && <FillBlank exercise={exercise} selected={selected} setSelected={setSelected} disabled={!!result} speechLanguage={speechLanguage} />}
              {exercise.type === 'type_answer' && <TypeAnswer exercise={exercise} answer={typed} setAnswer={setTyped} disabled={!!result} />}
              {exercise.type === 'match_pairs' && <MatchPairs exercise={exercise} matches={matches} setMatches={setMatches} disabled={!!result} speechLanguage={speechLanguage} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {!result && (
        <div className="border-t-2 border-outline p-4 md:p-6">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <button onClick={onQuit} className="duo-btn duo-btn-white px-6 py-3 text-sm">Skip</button>
            <button onClick={() => handleCheck()} disabled={!canCheck} className={cn('duo-btn px-8 py-3', canCheck ? 'duo-btn-green' : 'duo-btn-white')}>Check</button>
          </div>
        </div>
      )}
      <FeedbackBar result={result} exercise={exercise} onContinue={handleContinue} />

      <AnimatePresence>
        {outOfHearts && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
              className="surface rounded-3xl max-w-md w-full p-6 text-center border-2 border-outline">
              <div className="text-7xl mb-4">💔</div>
              <div className="text-2xl font-black text-duo-red mb-2">You ran out of hearts!</div>
              <div className="ink-3 font-bold mb-6">Practice to earn a heart, or refill with gems.</div>
              <button onClick={onQuit} className="duo-btn duo-btn-white w-full py-3 mb-2">Exit lesson</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
