'use client'

import { useMemo, useState, useCallback } from 'react'

export type LetterItem = {
  character: string
  pronunciation: string
  speechText?: string
  progress?: number
  isEmpty?: boolean
}

export type LanguageLettersData = {
  language: string
  code: string
  locale: string
  subtitle: string
  letters: (LetterItem | null)[]
}

const SPANISH_DATA: LanguageLettersData = {
  language: 'Spanish',
  code: 'es',
  locale: 'es-ES',
  subtitle: 'Learn the letters and sounds you need for Spanish',
  letters: [
    { character: 'A', pronunciation: 'a', speechText: 'a', progress: 100 },
    { character: 'B', pronunciation: 'b', speechText: 'be', progress: 80 },
    { character: 'C', pronunciation: 'c', speechText: 'ce', progress: 60 },
    { character: 'D', pronunciation: 'd', speechText: 'de', progress: 40 },
    { character: 'E', pronunciation: 'e', speechText: 'e', progress: 20 },
    { character: 'F', pronunciation: 'f', speechText: 'efe', progress: 0 },
    { character: 'G', pronunciation: 'g', speechText: 'ge', progress: 0 },
    { character: 'H', pronunciation: 'h', speechText: 'hache', progress: 0 },
    { character: 'I', pronunciation: 'i', speechText: 'i', progress: 0 },
    { character: 'J', pronunciation: 'j', speechText: 'jota', progress: 0 },
    { character: 'K', pronunciation: 'k', speechText: 'ka', progress: 0 },
    { character: 'L', pronunciation: 'l', speechText: 'ele', progress: 0 },
    { character: 'M', pronunciation: 'm', speechText: 'eme', progress: 0 },
    { character: 'N', pronunciation: 'n', speechText: 'ene', progress: 0 },
    { character: 'Ñ', pronunciation: 'ñ', speechText: 'eñe', progress: 0 },
    { character: 'O', pronunciation: 'o', speechText: 'o', progress: 0 },
    { character: 'P', pronunciation: 'p', speechText: 'pe', progress: 0 },
    { character: 'Q', pronunciation: 'q', speechText: 'cu', progress: 0 },
    { character: 'R', pronunciation: 'r', speechText: 'erre', progress: 0 },
    { character: 'S', pronunciation: 's', speechText: 'ese', progress: 0 },
    { character: 'T', pronunciation: 't', speechText: 'te', progress: 0 },
    { character: 'U', pronunciation: 'u', speechText: 'u', progress: 0 },
    { character: 'V', pronunciation: 'v', speechText: 'uve', progress: 0 },
    { character: 'W', pronunciation: 'w', speechText: 'uve doble', progress: 0 },
    { character: 'X', pronunciation: 'x', speechText: 'equis', progress: 0 },
    { character: 'Y', pronunciation: 'y', speechText: 'i griega', progress: 0 },
    { character: 'Z', pronunciation: 'z', speechText: 'zeta', progress: 0 },
  ],
}

const FRENCH_DATA: LanguageLettersData = {
  language: 'French',
  code: 'fr',
  locale: 'fr-FR',
  subtitle: 'Learn the letters and sounds you need for French',
  letters: [
    { character: 'A', pronunciation: 'a', speechText: 'a', progress: 100 },
    { character: 'B', pronunciation: 'b', speechText: 'bé', progress: 75 },
    { character: 'C', pronunciation: 'c', speechText: 'cé', progress: 50 },
    { character: 'D', pronunciation: 'd', speechText: 'dé', progress: 25 },
    { character: 'E', pronunciation: 'e', speechText: 'e', progress: 0 },
    { character: 'F', pronunciation: 'f', speechText: 'effe', progress: 0 },
    { character: 'G', pronunciation: 'g', speechText: 'gé', progress: 0 },
    { character: 'H', pronunciation: 'h', speechText: 'hache', progress: 0 },
    { character: 'I', pronunciation: 'i', speechText: 'i', progress: 0 },
    { character: 'J', pronunciation: 'j', speechText: 'ji', progress: 0 },
    { character: 'K', pronunciation: 'k', speechText: 'ka', progress: 0 },
    { character: 'L', pronunciation: 'l', speechText: 'elle', progress: 0 },
    { character: 'M', pronunciation: 'm', speechText: 'emme', progress: 0 },
    { character: 'N', pronunciation: 'n', speechText: 'enne', progress: 0 },
    { character: 'O', pronunciation: 'o', speechText: 'o', progress: 0 },
    { character: 'P', pronunciation: 'p', speechText: 'pé', progress: 0 },
    { character: 'Q', pronunciation: 'q', speechText: 'ku', progress: 0 },
    { character: 'R', pronunciation: 'r', speechText: 'erre', progress: 0 },
    { character: 'S', pronunciation: 's', speechText: 'esse', progress: 0 },
    { character: 'T', pronunciation: 't', speechText: 'té', progress: 0 },
    { character: 'U', pronunciation: 'u', speechText: 'u', progress: 0 },
    { character: 'V', pronunciation: 'v', speechText: 'vé', progress: 0 },
    { character: 'W', pronunciation: 'w', speechText: 'double vé', progress: 0 },
    { character: 'X', pronunciation: 'x', speechText: 'ixe', progress: 0 },
    { character: 'Y', pronunciation: 'y', speechText: 'i grec', progress: 0 },
    { character: 'Z', pronunciation: 'z', speechText: 'zède', progress: 0 },
  ],
}

const HINDI_DATA: LanguageLettersData = {
  language: 'Hindi',
  code: 'hi',
  locale: 'hi-IN',
  subtitle: 'Get to know the characters and sounds for Hindi',
  // Layout matching Duolingo Hindi grid (5 columns with structured empty placeholders)
  letters: [
    { character: 'क', pronunciation: 'ka', speechText: 'क', progress: 60 },
    { character: 'ख', pronunciation: 'kha', speechText: 'ख', progress: 40 },
    { character: 'ग', pronunciation: 'ga', speechText: 'ग', progress: 20 },
    { character: 'घ', pronunciation: 'gha', speechText: 'घ', progress: 0 },
    null, // empty slot
    { character: 'च', pronunciation: 'ca', speechText: 'च', progress: 30 },
    { character: 'छ', pronunciation: 'cha', speechText: 'छ', progress: 0 },
    { character: 'ज', pronunciation: 'ja', speechText: 'ज', progress: 0 },
    { character: 'झ', pronunciation: 'jha', speechText: 'झ', progress: 0 },
    null, // empty slot
    { character: 'ट', pronunciation: 'Ta', speechText: 'ट', progress: 0 },
    { character: 'ठ', pronunciation: 'Tha', speechText: 'ठ', progress: 0 },
    { character: 'ड', pronunciation: 'Da', speechText: 'ड', progress: 0 },
    { character: 'ढ', pronunciation: 'Dha', speechText: 'ढ', progress: 0 },
    null, // empty slot
    { character: 'त', pronunciation: 'ta', speechText: 'त', progress: 0 },
    { character: 'थ', pronunciation: 'tha', speechText: 'थ', progress: 0 },
    { character: 'द', pronunciation: 'da', speechText: 'द', progress: 0 },
    { character: 'ध', pronunciation: 'dha', speechText: 'ध', progress: 0 },
    { character: 'न', pronunciation: 'na', speechText: 'न', progress: 0 },
    { character: 'प', pronunciation: 'pa', speechText: 'प', progress: 0 },
    { character: 'फ', pronunciation: 'pha', speechText: 'फ', progress: 0 },
    { character: 'ब', pronunciation: 'ba', speechText: 'ब', progress: 0 },
    { character: 'भ', pronunciation: 'bha', speechText: 'भ', progress: 0 },
    { character: 'म', pronunciation: 'ma', speechText: 'म', progress: 0 },
    { character: 'य', pronunciation: 'ya', speechText: 'य', progress: 0 },
    { character: 'र', pronunciation: 'ra', speechText: 'र', progress: 0 },
    { character: 'ल', pronunciation: 'la', speechText: 'ल', progress: 0 },
    { character: 'व', pronunciation: 'va', speechText: 'व', progress: 0 },
    null, // empty slot
    { character: 'श', pronunciation: 'sha', speechText: 'श', progress: 0 },
    { character: 'ष', pronunciation: 'Sha', speechText: 'ष', progress: 0 },
    { character: 'स', pronunciation: 'sa', speechText: 'स', progress: 0 },
    { character: 'ह', pronunciation: 'ha', speechText: 'ह', progress: 0 },
    null, // empty slot
  ],
}

export default function Letters({ targetLanguage }: { targetLanguage?: string }) {
  const content = useMemo(() => {
    const normalized = (targetLanguage || 'Spanish').trim().toLowerCase()
    if (normalized === 'hindi' || normalized === 'hi') return HINDI_DATA
    if (normalized === 'french' || normalized === 'fr') return FRENCH_DATA
    return SPANISH_DATA
  }, [targetLanguage])

  const [activeChar, setActiveChar] = useState<string | null>(null)

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = content.locale
      utterance.rate = 0.85
      window.speechSynthesis.speak(utterance)
    } catch {
      // SpeechSynthesis audio fallback
    }
  }, [content.locale])

  const handleCardClick = (letter: LetterItem) => {
    setActiveChar(letter.character)
    speak(letter.speechText || letter.character)
  }

  const handleLearnLetters = () => {
    const first = content.letters.find(l => l !== null)
    if (first) {
      setActiveChar(first.character)
      speak(first.speechText || first.character)
    }
  }

  return (
    <div className="letters-page max-w-xl mx-auto px-4 py-8 pb-32">
      {/* Top Header */}
      <div className="letters-hero flex flex-col items-center text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-black ink mb-3">
          Let&apos;s learn {content.language}!
        </h1>
        <p className="text-[#777] dark:text-[#aaa] text-base sm:text-lg font-bold mb-6">
          {content.subtitle}
        </p>
        <button
          className="duo-btn duo-btn-blue letters-cta w-full max-w-[320px] h-12 text-sm font-black uppercase tracking-wider"
          type="button"
          onClick={handleLearnLetters}
        >
          LEARN THE LETTERS
        </button>
      </div>

      {/* 5-Column Grid */}
      <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
        {content.letters.map((letter, index) => {
          if (!letter) {
            // Empty placeholder box
            return (
              <div
                key={`empty-${index}`}
                className="h-[88px] sm:h-[96px] rounded-2xl border-2 border-[#e5e5e5] dark:border-white/10 bg-[#f7f7f7]/60 dark:bg-white/5 pointer-events-none"
              />
            )
          }

          const isSelected = activeChar === letter.character
          const progress = letter.progress ?? 0

          return (
            <button
              key={`${letter.character}-${index}`}
              onClick={() => handleCardClick(letter)}
              type="button"
              className={`letter-card flex flex-col items-center justify-between h-[88px] sm:h-[96px] p-2 sm:p-2.5 rounded-2xl border-2 transition-all duration-120 select-none surface ${
                isSelected
                  ? 'border-[#1cb0f6] bg-[#1cb0f6]/5 shadow-[0_3px_0_#1cb0f6]'
                  : 'border-[#e5e5e5] dark:border-white/10 hover:border-[#84d8ff] active:translate-y-0.5 shadow-[0_3px_0_#e5e5e5] dark:shadow-[0_3px_0_rgba(255,255,255,0.05)]'
              }`}
              aria-label={`Letter ${letter.character}`}
            >
              {/* Character */}
              <span className="text-2xl sm:text-3xl font-black ink leading-none mt-1">
                {letter.character}
              </span>

              {/* Pronunciation */}
              <span className="text-xs sm:text-sm font-bold text-[#888] dark:text-[#aaa] leading-none mb-1">
                {letter.pronunciation}
              </span>

              {/* Progress Bar */}
              <div className="w-9 sm:w-11 h-1.5 rounded-full bg-[#e5e5e5] dark:bg-white/10 overflow-hidden mb-0.5">
                {progress > 0 && (
                  <div
                    className="h-full bg-[#58cc02] rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="letters-coming-soon text-center mt-12 text-sm font-black uppercase tracking-wider text-[#afafaf] dark:text-[#777]">
        More units coming soon
      </div>
    </div>
  )
}
