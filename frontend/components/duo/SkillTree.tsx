'use client'
import { useEffect, useState } from 'react'
import { BookOpen, Star, Dumbbell, Trophy, FastForward, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import type { Course, Unit, SkillNodeData } from '@/lib/types'

const WINDING_OFFSETS = [0, -38, -50, -20, 20, 50, 38, 0]

function ChestIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
      <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2H4V6zm-1 4h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8zm8 2a1 1 0 0 0-1 1v2a1 1 0 0 0 2 0v-2a1 1 0 0 0-1-1z" />
    </svg>
  )
}

function NodeIcon({ type, isCompleted, isCurrent }: {
  type: 'star' | 'dumbbell' | 'chest' | 'trophy' | 'fastforward'
  isCompleted?: boolean
  isCurrent?: boolean
}) {
  const iconColorClass = (isCompleted || isCurrent) ? 'text-white fill-white' : 'text-[#a0a0a0] fill-[#a0a0a0]'
  const strokeColorClass = (isCompleted || isCurrent) ? 'text-white' : 'text-[#a0a0a0]'

  if (type === 'dumbbell') {
    return <Dumbbell className={cn('w-7 h-7', strokeColorClass)} strokeWidth={2.5} />
  }
  if (type === 'chest') {
    return <ChestIcon className={iconColorClass} />
  }
  if (type === 'trophy') {
    return <Trophy className={cn('w-7 h-7', iconColorClass)} />
  }
  if (type === 'fastforward') {
    return <FastForward className={cn('w-8 h-8 text-white fill-white')} />
  }
  return <Star className={cn('w-8 h-8', iconColorClass)} strokeWidth={2.5} />
}

interface PathLevelNode {
  id: string
  skillId?: string
  skillTitle?: string
  levelIndex: number
  isPlayable: boolean
  isCompleted: boolean
  isCurrent: boolean
  isLocked: boolean
  isJump?: boolean
  lessonId?: string | null
  iconType: 'star' | 'dumbbell' | 'chest' | 'trophy' | 'fastforward'
}

function UnitBanner({ unit }: { unit: Unit }) {
  return (
    <div
      className="unit-banner rounded-2xl px-5 py-4 flex items-center justify-between transition-colors duration-300"
      style={{ background: unit.color, boxShadow: `0 4px 0 0 ${unit.colorDark}` }}
    >
      <div className="text-white">
        <div className="text-xs font-black uppercase tracking-wider opacity-90 flex items-center gap-1 mb-1">
          <span>←</span>
          <span>{unit.title}</span>
        </div>
        <div className="text-xl font-black">{unit.subtitle}</div>
      </div>
      <button
        className="guidebook-button"
        type="button"
        aria-label={`Open guidebook for ${unit.title}`}
        onClick={() => toast.info(`${unit.title} Guidebook coming soon!`)}
      >
        <BookOpen className="h-5 w-5" />
        <span>Guidebook</span>
      </button>
    </div>
  )
}

function LevelPopover({
  node,
  unitColor,
  unitColorDark,
  onStart,
  onPractice,
  onLegendary,
  onClose,
}: {
  node: PathLevelNode
  unitColor: string
  unitColorDark: string
  onStart: (id: string) => void
  onPractice: (id: string) => void
  onLegendary: (id: string) => void
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      <div key="backdrop" className="fixed inset-0 z-20" onClick={onClose} />
      <motion.div
        key="popover"
        initial={{ opacity: 0, y: -10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="absolute z-30 top-24 left-1/2 -translate-x-1/2 w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rounded-2xl p-5 text-white text-center relative"
          style={{ background: unitColor, boxShadow: `0 4px 0 0 ${unitColorDark}` }}
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45" style={{ background: unitColor }} />
          <div className="text-xl font-black mb-1">{node.skillTitle || 'Practice'}</div>
          <div className="text-sm font-semibold opacity-90 mb-3">
            Level {node.levelIndex} • {node.isCompleted ? 'Completed! Practice or go legendary' : 'Start level'}
          </div>

          {!node.isCompleted && node.lessonId && (
            <button
              onClick={() => onStart(node.lessonId!)}
              className="duo-btn duo-btn-white w-full py-3 text-base mb-2 font-black uppercase tracking-wider"
            >
              Start +15 XP
            </button>
          )}

          {node.isCompleted && node.lessonId && (
            <>
              <button
                onClick={() => onPractice(node.lessonId!)}
                className="duo-btn duo-btn-white w-full py-3 text-base mb-2 flex items-center justify-center gap-2 font-black"
              >
                <span>❤️</span> Practice • +1 heart, +5 XP
              </button>
              <button
                onClick={() => onLegendary(node.lessonId!)}
                className="w-full py-3 text-base rounded-2xl font-bold uppercase tracking-wider bg-gradient-to-r from-duo-purple to-duo-blue text-white flex items-center justify-center gap-2"
                style={{ boxShadow: '0 4px 0 #6b3ecf' }}
              >
                <span>💎</span> Legendary • +40 XP
              </button>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function PathNodeView({
  node,
  unitColor,
  unitColorDark,
  offset,
  isOpen,
  onClick,
  onStart,
  onPractice,
  onLegendary,
  onClose,
}: {
  node: PathLevelNode
  unitColor: string
  unitColorDark: string
  offset: number
  isOpen: boolean
  onClick: () => void
  onStart: (id: string) => void
  onPractice: (id: string) => void
  onLegendary: (id: string) => void
  onClose: () => void
}) {
  const isLocked = node.isLocked
  const isCompleted = node.isCompleted
  const isCurrent = node.isCurrent
  const isJump = node.isJump

  const bg = isLocked ? '#e5e5e5' : isCompleted ? '#ffc800' : unitColor
  const bgDark = isLocked ? '#afafaf' : isCompleted ? '#e6b400' : unitColorDark

  return (
    <div className="relative flex flex-col items-center" style={{ transform: `translateX(${offset}px)` }}>
      {/* START Speech Bubble */}
      {isCurrent && !isCompleted && !isLocked && (
        <div className="absolute -top-11 z-10 animate-bounce pointer-events-none">
          <div
            className="surface font-black uppercase text-xs px-3.5 py-1.5 rounded-xl border-2 border-outline tracking-wider"
            style={{ color: unitColor, boxShadow: '0 2px 0 var(--shadow-outline)' }}
          >
            START
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 surface border-b-2 border-r-2 border-outline" />
          </div>
        </div>
      )}

      {/* JUMP HERE? Speech Bubble */}
      {isJump && (
        <div className="absolute -top-11 z-10 pointer-events-none">
          <div
            className="surface font-black uppercase text-xs px-3.5 py-1.5 rounded-xl border-2 tracking-wider"
            style={{ color: unitColor, borderColor: unitColor, boxShadow: '0 2px 0 var(--shadow-outline)' }}
          >
            JUMP HERE?
            <div
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 surface border-b-2 border-r-2"
              style={{ borderColor: unitColor }}
            />
          </div>
        </div>
      )}

      <div className="relative">
        {/* Circular Progress Ring for Current Node */}
        {isCurrent && !isCompleted && !isLocked && (
          <svg className="absolute -inset-2.5 -rotate-90 pointer-events-none" width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="43" fill="none" stroke="#e5e5e5" strokeWidth="5" />
            <circle
              cx="48"
              cy="48"
              r="43"
              fill="none"
              stroke={unitColor}
              strokeWidth="5"
              strokeDasharray={2 * Math.PI * 43}
              strokeDashoffset={2 * Math.PI * 43 * 0.75}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
        )}

        {/* Circular Level Node Button */}
        <button
          type="button"
          onClick={onClick}
          disabled={isLocked}
          aria-label={isJump ? 'Jump here' : `Level ${node.levelIndex}`}
          className={cn(
            'w-[76px] h-[76px] rounded-full flex items-center justify-center transition-transform select-none',
            isLocked ? 'cursor-default pointer-events-none' : 'cursor-pointer active:translate-y-1.5'
          )}
          style={{
            background: bg,
            boxShadow: `0 7px 0 0 ${bgDark}`,
          }}
        >
          <NodeIcon type={node.iconType} isCompleted={isCompleted} isCurrent={isCurrent} />
        </button>
      </div>

      {/* Popover */}
      {isOpen && (
        <LevelPopover
          node={node}
          unitColor={unitColor}
          unitColorDark={unitColorDark}
          onStart={onStart}
          onPractice={onPractice}
          onLegendary={onLegendary}
          onClose={onClose}
        />
      )}
    </div>
  )
}

function buildUnitNodes(unit: Unit): PathLevelNode[] {
  // If unit has playable skills
  if (unit.skills && unit.skills.length > 0) {
    const nodes: PathLevelNode[] = []

    unit.skills.forEach((skill: SkillNodeData, skillIdx: number) => {
      // Previous skill is finished when its playable levels are completed
      const previousSkillFinished =
        skillIdx === 0 ||
        (unit.skills[skillIdx - 1]?.lessons[1]?.completed ?? false) ||
        (unit.skills[skillIdx - 1]?.lessonsCompleted ?? 0) >= 2 ||
        (unit.skills[skillIdx - 1]?.finished ?? false)

      const isSkillUnlocked = skill.unlocked && previousSkillFinished

      // Level 1: Playable
      const l1Completed = Boolean(skill.lessons[0]?.completed || skill.lessonsCompleted >= 1)
      const l1Current = isSkillUnlocked && !l1Completed
      nodes.push({
        id: `${skill.id}-lvl-1`,
        skillId: skill.id,
        skillTitle: skill.title,
        levelIndex: 1,
        isPlayable: true,
        isCompleted: l1Completed,
        isCurrent: l1Current,
        isLocked: !isSkillUnlocked,
        lessonId: skill.lessons[0]?.id || null,
        iconType: 'star',
      })

      // Level 2: Playable (unlocks after Level 1)
      const l2Completed = Boolean(skill.lessons[1]?.completed || skill.lessonsCompleted >= 2)
      const l2Unlocked = isSkillUnlocked && l1Completed
      const l2Current = l2Unlocked && !l2Completed
      nodes.push({
        id: `${skill.id}-lvl-2`,
        skillId: skill.id,
        skillTitle: skill.title,
        levelIndex: 2,
        isPlayable: true,
        isCompleted: l2Completed,
        isCurrent: l2Current,
        isLocked: !l2Unlocked,
        lessonId: skill.lessons[1]?.id || null,
        iconType: 'star',
      })

      // Level 3: Locked future level (Dumbbell)
      nodes.push({
        id: `${skill.id}-lvl-3`,
        skillId: skill.id,
        skillTitle: skill.title,
        levelIndex: 3,
        isPlayable: false,
        isCompleted: false,
        isCurrent: false,
        isLocked: true,
        lessonId: null,
        iconType: 'dumbbell',
      })

      // Level 4: Locked future level (Chest or Trophy milestone)
      nodes.push({
        id: `${skill.id}-lvl-4`,
        skillId: skill.id,
        skillTitle: skill.title,
        levelIndex: 4,
        isPlayable: false,
        isCompleted: false,
        isCurrent: false,
        isLocked: true,
        lessonId: null,
        iconType: skillIdx === unit.skills.length - 1 ? 'trophy' : 'chest',
      })
    })

    return nodes
  }

  // Future / locked placeholder unit (Unit 2, Unit 3)
  const isUnit2 = unit.id.endsWith('-u2') || unit.title.includes('Unit 2')
  return [
    {
      id: `${unit.id}-jump`,
      levelIndex: 1,
      isPlayable: false,
      isCompleted: false,
      isCurrent: false,
      isLocked: false,
      isJump: true,
      lessonId: null,
      iconType: 'fastforward',
    },
    {
      id: `${unit.id}-node-2`,
      levelIndex: 2,
      isPlayable: false,
      isCompleted: false,
      isCurrent: false,
      isLocked: true,
      lessonId: null,
      iconType: isUnit2 ? 'star' : 'chest',
    },
    {
      id: `${unit.id}-node-3`,
      levelIndex: 3,
      isPlayable: false,
      isCompleted: false,
      isCurrent: false,
      isLocked: true,
      lessonId: null,
      iconType: isUnit2 ? 'dumbbell' : 'star',
    },
    {
      id: `${unit.id}-node-4`,
      levelIndex: 4,
      isPlayable: false,
      isCompleted: false,
      isCurrent: false,
      isLocked: true,
      lessonId: null,
      iconType: isUnit2 ? 'chest' : 'dumbbell',
    },
    {
      id: `${unit.id}-node-5`,
      levelIndex: 5,
      isPlayable: false,
      isCompleted: false,
      isCurrent: false,
      isLocked: true,
      lessonId: null,
      iconType: 'star',
    },
    {
      id: `${unit.id}-node-6`,
      levelIndex: 6,
      isPlayable: false,
      isCompleted: false,
      isCurrent: false,
      isLocked: true,
      lessonId: null,
      iconType: isUnit2 ? 'trophy' : 'chest',
    },
  ]
}

export default function SkillTree({
  course,
  onStartLesson,
  onStartPractice,
  onStartLegendary,
}: {
  course: Course
  onStartLesson: (id: string) => void
  onStartPractice: (id: string) => void
  onStartLegendary: (id: string) => void
}) {
  const [openNodeId, setOpenNodeId] = useState<string | null>(null)
  const [activeUnitId, setActiveUnitId] = useState(course.units[0]?.id ?? '')

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-unit-id]'))
    if (!sections.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveUnitId(visible[0].target.getAttribute('data-unit-id') || '')
      },
      { rootMargin: '-145px 0px -55% 0px', threshold: 0 }
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [course.units])

  const activeUnit = course.units.find((unit) => unit.id === activeUnitId) ?? course.units[0]

  return (
    <div className="max-w-xl mx-auto px-4 pb-24">
      {/* Sticky Unit Header Banner */}
      {activeUnit && (
        <div className="unit-header-slot">
          <UnitBanner unit={activeUnit} />
        </div>
      )}

      {/* Units Winding Path */}
      {course.units.map((unit, unitIdx) => {
        const unitNodes = buildUnitNodes(unit)

        return (
          <div key={unit.id} data-unit-id={unit.id} className="unit-section mb-14">
            {/* Section divider between units */}
            {unitIdx > 0 && (
              <div className="path-section-label my-10">
                {unit.subtitle}
              </div>
            )}

            <div className={cn("flex flex-col items-center gap-10 relative", unitIdx === 0 ? "pt-14" : "pt-4")}>
              {unitNodes.map((node, nodeIdx) => {
                const offset = WINDING_OFFSETS[nodeIdx % WINDING_OFFSETS.length]

                return (
                  <div key={node.id} className="relative w-full flex justify-center">
                    {unitIdx === 0 && nodeIdx === 2 && (
                      <div className="absolute left-1/2 translate-x-[55px] sm:translate-x-[70px] -top-12 sm:-top-16 pointer-events-none select-none z-0">
                        <img
                          src="https://d35aaqx5ub95lt.cloudfront.net/images/goals/64d0bbcd8f4e6d5018502540f1e0094b.svg"
                          alt="Duo"
                          className="w-44 sm:w-52 md:w-60 h-auto drop-shadow-sm"
                        />
                      </div>
                    )}
                    <PathNodeView
                      node={node}
                      unitColor={unit.color}
                      unitColorDark={unit.colorDark}
                      offset={offset}
                      isOpen={openNodeId === node.id}
                      onClick={() => {
                        if (node.isJump) {
                          toast.info(`Complete Unit 1 to unlock ${unit.title}!`)
                          return
                        }
                        if (!node.isLocked && node.isPlayable) {
                          setOpenNodeId(openNodeId === node.id ? null : node.id)
                        }
                      }}
                      onStart={(lid) => {
                        setOpenNodeId(null)
                        onStartLesson(lid)
                      }}
                      onPractice={(lid) => {
                        setOpenNodeId(null)
                        onStartPractice(lid)
                      }}
                      onLegendary={(lid) => {
                        setOpenNodeId(null)
                        onStartLegendary(lid)
                      }}
                      onClose={() => setOpenNodeId(null)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Section 2 UP NEXT Card */}
      <div
        className="w-full my-12 rounded-3xl border-2 border-outline surface p-8 text-center"
        style={{ boxShadow: '0 4px 0 0 var(--shadow-outline)' }}
      >
        <div className="inline-block rounded-md bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-black uppercase tracking-wider text-gray-400">
          UP NEXT
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 text-2xl font-black ink">
          <Lock className="h-6 w-6 text-gray-400" />
          <span>Section 2</span>
        </div>
        <p className="mt-2 text-sm font-semibold text-gray-500 max-w-sm mx-auto">
          Learn words, phrases, and grammar concepts for basic interactions
        </p>
        <button
          type="button"
          onClick={() => toast.info('Section 2 unlocks after completing Section 1!')}
          className="mt-6 w-full py-3.5 rounded-2xl border-2 border-outline font-black uppercase tracking-wider text-duo-blue surface hover:bg-surface-2 transition-all cursor-pointer"
          style={{ boxShadow: '0 3px 0 0 var(--shadow-outline)' }}
        >
          JUMP HERE?
        </button>
      </div>
    </div>
  )
}

