'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Flame, Lock, Gift, Check, Sparkles, Zap, TrendingUp, Trophy } from 'lucide-react';

interface StreakData {
  currentStreak: number;
  lastCheckIn: string | null;
  totalPowerLevel: number;
  unlockedBadges: string[];
  canCheckIn: boolean;
  bestStreak: number;
  connectedDays: number; // cumulative logins
  unlockedRanks: string[]; // chess rank keys
  loginHistory: string[]; // ISO dates of days claimed (YYYY-MM-DD)
}

const REWARDS = [
  { day: 1, points: 20 },
  { day: 2, points: 30 },
  { day: 3, points: 40, badge: '🪫' },
  { day: 4, points: 50 },
  { day: 5, points: 70, badge: '🔋' },
  { day: 6, points: 70 },
  { day: 7, points: 70, special: 'mystery' },
];

const ALL_BADGES = [
  { badge: '🪫', name: 'Spark', days: 3, description: '3-day streak' },
  { badge: '🔋', name: 'Charged', days: 5, description: '5-day streak' },
  { badge: '⚡', name: 'Power User', days: 14, description: '14-day streak' },
];

const BADGE_NAME: Record<string, string> = {
  '🪫': 'Spark',
  '🔋': 'Charged',
  '⚡': 'Power User',
};

type ChessRank = { key: string; symbol: string; threshold: number; boost: number };
const CHESS_RANKS: ChessRank[] = [
  { key: 'Silver Knight', symbol: '♞', threshold: 30, boost: 0.05 },
  { key: 'Silver Bishop', symbol: '♝', threshold: 60, boost: 0.08 },
  { key: 'Silver Rook', symbol: '♜', threshold: 90, boost: 0.14 },
  { key: 'Silver Queen', symbol: '♛', threshold: 120, boost: 0.17 },
  { key: 'Silver King', symbol: '♚', threshold: 150, boost: 0.20 },
  { key: 'Gold Knight', symbol: '♞', threshold: 180, boost: 0.23 },
  { key: 'Gold Bishop', symbol: '♝', threshold: 210, boost: 0.26 },
  { key: 'Gold Rook', symbol: '♜', threshold: 240, boost: 0.29 },
  { key: 'Gold Queen', symbol: '♛', threshold: 270, boost: 0.32 },
  { key: 'Gold King', symbol: '♚', threshold: 300, boost: 0.35 },
  { key: 'Emerald Bishop', symbol: '♝', threshold: 330, boost: 0.38 },
  { key: 'Emerald Rook', symbol: '♜', threshold: 360, boost: 0.41 },
  { key: 'Emerald Queen', symbol: '♛', threshold: 390, boost: 0.44 },
  { key: 'Emerald King', symbol: '♚', threshold: 420, boost: 0.47 },
  { key: 'Diamond Rook', symbol: '♜', threshold: 450, boost: 0.50 },
  { key: 'Diamond Queen', symbol: '♛', threshold: 480, boost: 0.53 },
  { key: 'Diamond King', symbol: '♚', threshold: 510, boost: 0.56 },
];

const getHighestUnlockedRank = (connectedDays: number) => {
  const unlocked = CHESS_RANKS.filter(r => connectedDays >= r.threshold);
  return unlocked.length ? unlocked[unlocked.length - 1] : null;
};

const getNextRank = (connectedDays: number) => CHESS_RANKS.find(r => connectedDays < r.threshold) || null;

const toYMD = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeekMonday = (d: Date) => {
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // shift so Monday is start
  return addDays(d, diff);
};

const getEncouragingMessage = (streak: number): string => {
  if (streak === 0) return "Start your power journey today! 🚀";
  if (streak === 1) return "Excellent start! Tomorrow's power boost awaits!";
  if (streak === 2) return "Building momentum! Spark badge tomorrow! 🪫";
  if (streak === 3) return "Spark achieved! You're officially powered up! 🔥";
  if (streak === 4) return "One day away from Charged status! ⚡";
  if (streak === 5) return "Charged up! You're unstoppable now! 🔋";
  if (streak === 6) return "Keep pushing! Your consistency is paying off! 💪";
  if (streak === 7) return "One week strong! You're building real power! 🏆";
  if (streak < 14) return `Power User in ${14 - streak} days! Keep grinding! 💪`;
  if (streak === 14) return "POWER USER STATUS! You're in the elite! ⚡";
  if (streak < 30) return `Legendary ${streak}-day streak! You're dominating! 🌟`;
  if (streak < 50) return `Incredible ${streak} days! True dedication! 💎`;
  if (streak < 100) return `${100 - streak} days to CENTURY! History awaits! 👑`;
  return `Day ${streak}! Absolute legend! 🏅`;
};

const DEBUG_MODE = true; // Set to false for production
const RESET_STORAGE = false; // Set to true to reset storage on load

export default function StreakModal() {
  const [isOpen, setIsOpen] = useState(true);
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    lastCheckIn: null,
    totalPowerLevel: 0,
    unlockedBadges: [],
    canCheckIn: true,
    bestStreak: 0,
    connectedDays: 0,
    unlockedRanks: [],
    loginHistory: [],
  });
  const [isChecking, setIsChecking] = useState(false);
  const [showCelebration, setShowCelebration] = useState<string | null>(null);
  const [celebrationLabel, setCelebrationLabel] = useState<string | null>(null);
  const [celebrationBoost, setCelebrationBoost] = useState<number | null>(null);
  const [showBarShine, setShowBarShine] = useState(false);
  const [mysteryReward, setMysteryReward] = useState<number | null>(null);
  const [showTomorrowHighlight, setShowTomorrowHighlight] = useState(false);

  const reduceMotion = useReducedMotion();
  const upcomingDay = streakData.currentStreak + 1;
  const staticTodayReward = REWARDS.find(r => r.day === upcomingDay);
  const isMysteryToday = staticTodayReward?.special === 'mystery';
  const todayPoints = staticTodayReward?.points ?? 0;
  const [lastClaimedDay, setLastClaimedDay] = useState<number | null>(null);

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const todayCardRef = useRef<HTMLDivElement | null>(null);
  const activeMilestoneRef = useRef<HTMLDivElement | null>(null);
  const powerStatRef = useRef<HTMLDivElement | null>(null);

  type Particle = { id: number; x: number; y: number; dx: number; dy: number; duration: number; delay: number };
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleId = useRef(0);

  const getCenter = (el: HTMLElement | null) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  const emitParticles = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    count: number,
    duration: number
  ) => {
    const idBase = particleId.current;
    const created: Particle[] = Array.from({ length: count }).map((_, i) => {
      const jitter = (n: number) => (Math.random() - 0.5) * n;
      const dx = to.x - from.x + jitter(20);
      const dy = to.y - from.y + jitter(20);
      return { id: idBase + i + Math.random(), x: from.x, y: from.y, dx, dy, duration, delay: i * (duration / (count * 2)) };
    });
    particleId.current += count + 1;
    setParticles(prev => [...prev, ...created]);
    const ids = new Set(created.map(c => c.id));
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !ids.has(p.id)));
    }, duration + 300);
    return new Promise<void>(res => setTimeout(res, duration));
  };

  const runParticleFlow = async (snap?: {
    fromBtn?: { x: number; y: number } | null;
    toToday?: { x: number; y: number } | null;
    toMilestone?: { x: number; y: number } | null;
    toPower?: { x: number; y: number } | null;
  }) => {
    if (reduceMotion) return;
    const f = snap?.fromBtn ?? null;
    const t1 = snap?.toToday ?? null;
    const t2 = snap?.toMilestone ?? null;
    const t3 = snap?.toPower ?? null;
    if (f && t1) await emitParticles(f, t1, 10, 400);
    if (t1 && t2) await emitParticles(t1, t2, 8, 400);
    if (t2 && t3) await emitParticles(t2, t3, 6, 400);
  };

  useEffect(() => {
    if (RESET_STORAGE) {
      localStorage.removeItem('streakData');
      console.log('Storage reset');
      return;
    }
    const stored = localStorage.getItem('streakData');
    if (stored) {
      const data = JSON.parse(stored);
      if (!data.bestStreak) {
        data.bestStreak = data.currentStreak;
      }
      if (data.connectedDays == null) {
        data.connectedDays = data.currentStreak || 0;
      }
      if (!data.unlockedRanks) {
        data.unlockedRanks = CHESS_RANKS.filter(r => data.connectedDays >= r.threshold).map(r => r.key);
      }
      if (!data.loginHistory) {
        // Reconstruct simple history from lastCheckIn and currentStreak
        const history: string[] = [];
        if (data.lastCheckIn && data.currentStreak > 0) {
          const last = new Date(data.lastCheckIn);
          for (let i = 0; i < data.currentStreak; i++) {
            history.push(toYMD(addDays(last, -i)));
          }
        }
        data.loginHistory = Array.from(new Set(history)).slice(-60);
      }
      console.log('Loaded streak data:', data);
      setStreakData(data);
    } else {
      console.log('No stored data, starting fresh');
    }
  }, []);

  useEffect(() => {
    if (streakData.lastCheckIn) {
      const lastDate = new Date(streakData.lastCheckIn);
      const now = new Date();
      const timeSinceLastCheckIn = now.getTime() - lastDate.getTime();

      const cooldownTime = DEBUG_MODE ? 5000 : (24 * 60 * 60 * 1000);
      const resetTime = DEBUG_MODE ? 15000 : (48 * 60 * 60 * 1000);

      if (timeSinceLastCheckIn < cooldownTime) {
        setStreakData(prev => ({ ...prev, canCheckIn: false }));

        const timeRemaining = cooldownTime - timeSinceLastCheckIn;
        setTimeout(() => {
          setStreakData(prev => ({ ...prev, canCheckIn: true }));
        }, timeRemaining);
      } else if (timeSinceLastCheckIn > resetTime) {
        setStreakData(prev => ({
          ...prev,
          currentStreak: 0,
          canCheckIn: true
        }));
      }
    }
  }, [streakData.lastCheckIn]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleCheckIn = async () => {
    if (!streakData.canCheckIn || isChecking) return;

    setIsChecking(true);
    await new Promise(resolve => setTimeout(resolve, 600));

    // Snapshot positions for particle flow
    const btnPos = getCenter(btnRef.current);
    const todayPos = getCenter(todayCardRef.current);
    const milestonePos = getCenter(activeMilestoneRef.current);
    const powerPos = getCenter(powerStatRef.current);

    const newStreak = streakData.currentStreak + 1;
    console.log('Checking in: current streak', streakData.currentStreak, '-> new streak', newStreak);
    setLastClaimedDay(newStreak <= 7 ? newStreak : ((newStreak - 1) % 7) + 1);
    const todayReward = REWARDS.find(r => r.day === newStreak) || { points: 70 };
    let basePoints = todayReward.points;

    // Day 7 gets a bonus mystery box
    if (newStreak === 7) {
      const roll = Math.random();
      if (roll < 0.05) {
        basePoints = 500;
        setMysteryReward(500);
      } else if (roll < 0.20) {
        basePoints = 300;
        setMysteryReward(300);
      } else if (roll < 0.40) {
        basePoints = 150;
        setMysteryReward(150);
      } else {
        basePoints = 100;
        setMysteryReward(100);
      }
      setTimeout(() => setMysteryReward(null), 2500);
    }

    const newBestStreak = Math.max(newStreak, streakData.bestStreak || 0);

    // Connected days and ranks
    const prevConnected = streakData.connectedDays || 0;
    const newConnected = prevConnected + 1;
    const beforeRank = getHighestUnlockedRank(prevConnected);
    const afterRank = getHighestUnlockedRank(newConnected);
    const newlyUnlockedRank = afterRank && (!beforeRank || afterRank.threshold > beforeRank.threshold) ? afterRank : null;

    // Power User boost is active only while current streak >= 14 (streak-based)
    const powerBoostAfter = newStreak >= 14 ? 0.15 : 0;
    const rankBoostAfter = afterRank?.boost || 0;
    const appliedBoost = Math.max(powerBoostAfter, rankBoostAfter);
    const pointsToAdd = Math.round(basePoints * (1 + appliedBoost));

    const todayISO = toYMD(new Date());
    const newData: StreakData = {
      currentStreak: newStreak,
      lastCheckIn: new Date().toISOString(),
      totalPowerLevel: streakData.totalPowerLevel + pointsToAdd,
      unlockedBadges: [...streakData.unlockedBadges],
      canCheckIn: false,
      bestStreak: newBestStreak,
      connectedDays: newConnected,
      unlockedRanks: [...(streakData.unlockedRanks || [])],
      loginHistory: Array.from(new Set([...(streakData.loginHistory || []), todayISO])).slice(-60),
    };

    // Check for badge unlocks at day 3, 5, and 14
    if (newStreak === 3 && !newData.unlockedBadges.includes('🪫')) {
      newData.unlockedBadges.push('🪫');
      setShowCelebration('🪫');
      setCelebrationLabel('Spark');
      setTimeout(() => { setShowCelebration(null); setCelebrationLabel(null); }, 3000);
    }
    if (newStreak === 5 && !newData.unlockedBadges.includes('🔋')) {
      newData.unlockedBadges.push('🔋');
      setShowCelebration('🔋');
      setCelebrationLabel('Charged');
      setTimeout(() => { setShowCelebration(null); setCelebrationLabel(null); }, 3000);
    }
    if (newStreak === 14 && !newData.unlockedBadges.includes('⚡')) {
      newData.unlockedBadges.push('⚡');
      setShowCelebration('⚡');
      setCelebrationLabel('Power User (+15% PL)');
      setCelebrationBoost(15);
      setTimeout(() => { setShowCelebration(null); setCelebrationLabel(null); setCelebrationBoost(null); }, 3000);
    }

    // Rank unlock celebration
    if (newlyUnlockedRank && !newData.unlockedRanks.includes(newlyUnlockedRank.key)) {
      newData.unlockedRanks.push(newlyUnlockedRank.key);
      setShowCelebration(newlyUnlockedRank.symbol);
      const boostPct = Math.round(newlyUnlockedRank.boost * 100);
      setCelebrationLabel(`${newlyUnlockedRank.key} (+${boostPct}% PL)`);
      setCelebrationBoost(boostPct);
      setTimeout(() => { setShowCelebration(null); setCelebrationLabel(null); setCelebrationBoost(null); }, 3000);
    }

    setStreakData(newData);
    localStorage.setItem('streakData', JSON.stringify(newData));
    setIsChecking(false);

    // Bar shine pulse
    setShowBarShine(true);
    setTimeout(() => setShowBarShine(false), 900);

    // Particle flow: button -> today -> progress bar -> total power
    void runParticleFlow({ fromBtn: btnPos, toToday: todayPos, toMilestone: milestonePos, toPower: powerPos });

    // Show tomorrow's reward highlight
    setShowTomorrowHighlight(true);
    setTimeout(() => setShowTomorrowHighlight(false), 3000);

    if (DEBUG_MODE) {
      setTimeout(() => {
        setStreakData(prev => ({ ...prev, canCheckIn: true }));
      }, 5000);
    }
  };

  const WEEKDAY_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const getCurrentWeekRewards = () => {
    const connected = streakData.connectedDays || 0;
    const inWeeklyMode = streakData.currentStreak >= 8 || connected >= 8;

    if (!inWeeklyMode) {
      // Early phase 1..7
      return REWARDS.map((reward, index) => {
        const dayNumber = index + 1;
        const isCollected = dayNumber <= streakData.currentStreak;
        const isToday = dayNumber === streakData.currentStreak + 1;
        const isTomorrow = dayNumber === streakData.currentStreak + 2;
        const isLocked = dayNumber > streakData.currentStreak + 1;
        return {
          ...reward,
          dayNumber,
          label: isToday ? 'Today' : isTomorrow ? 'Tomorrow' : `Day ${dayNumber}`,
          dateISO: null as string | null,
          isCollected,
          isMissed: false,
          isToday,
          isTomorrow,
          isLocked,
        };
      });
    }

    // Weekly rolling view (Mon..Sun)
    const today = new Date();
    const weekStart = startOfWeekMonday(today);
    const todayISO = toYMD(today);
    const hist = new Set(streakData.loginHistory || []);

    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(weekStart, i);
      const iso = toYMD(date);
      const isToday = iso === todayISO;
      const tomorrowISO = toYMD(addDays(today, 1));
      const isTomorrow = iso === tomorrowISO;
      const isFuture = date > today;
      const isPast = date < today;
      const isCollected = hist.has(iso);
      const isMissed = isPast && !isCollected;
      const isLocked = isFuture && !isTomorrow; // allow tomorrow highlight, lock further future
      const weekday = WEEKDAY_ABBR[date.getDay()];
      return {
        dayNumber: i + 1,
        label: isToday ? 'Today' : isTomorrow ? 'Tomorrow' : weekday,
        dateISO: iso,
        points: 70,
        badge: undefined as string | undefined,
        special: undefined as string | undefined,
        isCollected,
        isMissed,
        isToday,
        isTomorrow,
        isLocked,
      };
    });
  };

  const getNextMilestone = () => {
    return ALL_BADGES.find(m => m.days > streakData.currentStreak);
  };

  const nextMilestone = getNextMilestone();
  const prevMilestone = [...ALL_BADGES].reverse().find(m => m.days <= streakData.currentStreak);
  const prevDays = prevMilestone?.days ?? 0;
  const progressNeeded = nextMilestone ? nextMilestone.days - prevDays : 0;
  const progressDone = Math.max(0, streakData.currentStreak - prevDays);
  const nextProgressPercent = nextMilestone ? Math.min(100, Math.max(0, (progressDone / progressNeeded) * 100)) : 100;
  const daysRemaining = nextMilestone ? Math.max(0, nextMilestone.days - streakData.currentStreak) : 0;

  // Chess rank progress
  const nextRank = getNextRank(streakData.connectedDays || 0);
  const prevRank = getHighestUnlockedRank(streakData.connectedDays || 0);
  const rankPrev = prevRank?.threshold ?? 0;
  const rankNeeded = nextRank ? nextRank.threshold - rankPrev : 0;
  const rankDone = Math.max(0, (streakData.connectedDays || 0) - rankPrev);
  const rankPercent = nextRank ? Math.min(100, Math.max(0, (rankDone / rankNeeded) * 100)) : 100;

  // Choose target: prioritize streak mini-milestones if actively streaking; otherwise use ranks
  const useStreakTarget = !!nextMilestone && streakData.currentStreak < 14;
  const targetLabel = useStreakTarget
    ? (nextMilestone ? `Next: ${nextMilestone.badge} ${nextMilestone.name} in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}` : 'All streak milestones unlocked')
    : (nextRank ? `Next: ${nextRank.symbol} ${nextRank.key} in ${nextRank.threshold - (streakData.connectedDays || 0)} day${(nextRank.threshold - (streakData.connectedDays || 0)) === 1 ? '' : 's'}` : 'All ranks unlocked');
  const targetPercent = useStreakTarget ? nextProgressPercent : rankPercent;
  // Only show +15% when Power User is active; otherwise omit. Still show rank boosts when targeting ranks.
  const targetBoostRight = useStreakTarget
    ? undefined
    : (nextRank ? `+${Math.round(nextRank.boost * 100)}% PL boost` : undefined);
  const progressKey = useStreakTarget
    ? `streak-${nextMilestone?.days ?? 'done'}-${streakData.currentStreak}`
    : `rank-${nextRank?.threshold ?? 'done'}-${streakData.connectedDays ?? 0}`;

  // Active boost (for button text)
  const activeRank = getHighestUnlockedRank(streakData.connectedDays || 0);
  const activeBoost = Math.max((streakData.currentStreak >= 14 ? 0.15 : 0), activeRank?.boost || 0);
  const powerUserActive = streakData.currentStreak >= 14;
  const todayISOGlobal = toYMD(new Date());

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={() => setIsOpen(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-slate-900/95 border border-slate-800 p-8 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <h2 id="dialog-title" className="text-lg font-semibold text-white">Streak day {streakData.currentStreak}</h2>
            </div>
            <button
              aria-label="Close"
              className="rounded-full bg-slate-800/60 border border-slate-700 text-slate-300 hover:bg-slate-700/60 transition-colors px-2 py-1"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="text-center mb-6">
            <p className="text-slate-200 text-base md:text-lg font-medium">
              {getEncouragingMessage(streakData.currentStreak)}
            </p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                <Zap className="w-4 h-4" />
                {isMysteryToday ? 'Mystery box today' : `+${todayPoints} PL today`}
              </span>
              {nextMilestone && (
                <span className="text-slate-400 text-xs">• Next: {nextMilestone.badge} {nextMilestone.days}d</span>
              )}
            </div>
          </div>

          {/* Weekly rewards (compact) */}
          {/* Week label for rolling view */}
          {(streakData.currentStreak >= 8 || (streakData.connectedDays || 0) >= 8) && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Week {Math.max(1, Math.floor((streakData.connectedDays || 0) / 7) + 1)}</span>
              <span className="text-xs text-slate-500">Keep the chain unbroken</span>
            </div>
          )}
          <div className="grid grid-cols-7 gap-2 mb-6">
            {getCurrentWeekRewards().map((reward, index) => (
              <motion.div
                key={index}
                initial={reduceMotion ? {} : { opacity: 0, y: 12 }}
                animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative"
              >
                <motion.div
                  ref={reward.isToday ? todayCardRef : undefined}
                  animate={!reduceMotion && reward.isToday && streakData.canCheckIn ? { y: [0, -4, 0] } : {}}
                  transition={{ duration: 1.8, repeat: !reduceMotion && reward.isToday && streakData.canCheckIn ? Infinity : 0, ease: "easeInOut" }}
                  className={`
                    relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all
                    ${reward.isCollected
                      ? 'bg-slate-800/60 border-slate-700/80 opacity-60'
                      : reward.isMissed
                      ? 'bg-slate-800/30 border-slate-700/50 opacity-60'
                      : reward.isToday && streakData.canCheckIn
                      ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/20'
                      : reward.isTomorrow && showTomorrowHighlight
                      ? 'bg-green-500/10 border-green-500'
                      : 'bg-slate-800/50 border-slate-700'
                    }
                  `}
                >
                  <div className={`text-xs mb-1 ${
                    reward.isToday
                      ? 'text-amber-400 font-semibold'
                      : (reward.isTomorrow && showTomorrowHighlight)
                      ? 'text-green-400 font-semibold'
                      : reward.isMissed
                      ? 'text-slate-600'
                      : 'text-slate-500'
                  }`}>
                    {reward.label}
                  </div>

                  {reward.isCollected ? (
                    ((reward.dateISO && reward.dateISO === todayISOGlobal) || (!reward.dateISO && lastClaimedDay && reward.dayNumber === lastClaimedDay)) ? (
                      <motion.div initial={{ scale: 0.6, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}>
                        <Check size={20} className="text-green-500 mb-1" />
                      </motion.div>
                    ) : (
                      <Check size={20} className="text-green-500 mb-1" />
                    )
                  ) : reward.isLocked ? (
                    <Lock size={20} className="text-slate-600 mb-1" />
                  ) : reward.special === 'mystery' ? (
                    <Gift size={20} className="text-purple-400 mb-1" />
                  ) : reward.badge ? (
                    <span className="text-xl mb-1">{reward.badge}</span>
                  ) : (
                    <Zap size={20} className={`mb-1 ${reward.isTomorrow && showTomorrowHighlight ? 'text-green-400' : 'text-amber-500'}`} />
                  )}

                  <div className={`text-sm font-bold ${
                    reward.isToday
                      ? 'text-amber-500'
                      : (reward.isTomorrow && showTomorrowHighlight)
                      ? 'text-green-400'
                      : reward.isCollected
                      ? 'text-slate-400'
                      : 'text-amber-400'
                  }`}>
                    +{reward.points}
                    <span className="text-[10px] font-semibold ml-1">PL</span>
                  </div>

                  {reward.isToday && streakData.canCheckIn && !reduceMotion && (
                    <div className="absolute inset-0 rounded-lg card-shine" />
                  )}
                  {reward.isTomorrow && showTomorrowHighlight && (
                    <div className="absolute inset-0 rounded-lg animate-pulse bg-green-400/10" />
                  )}
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* Unified progress (streak first, then ranks) */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300 flex items-center gap-2">
                <span>{targetLabel}</span>
                {powerUserActive && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 text-[10px] border border-amber-500/30">Power User +15%</span>
                )}
              </span>
              {targetBoostRight && (
                <span className="text-xs text-amber-400 font-semibold">{targetBoostRight}</span>
              )}
            </div>
            <div className="relative h-2 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
              <motion.div
                key={progressKey}
                ref={activeMilestoneRef}
                initial={{ width: 0 }}
                animate={{ width: `${targetPercent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-amber-500 to-amber-600"
              />
              {showBarShine && !reduceMotion && (
                <div className="absolute inset-0 rounded-full card-shine pointer-events-none" />
              )}
            </div>
          </div>

          {/* Check-In Button */}
          <motion.button
            ref={btnRef}
            whileHover={streakData.canCheckIn ? { scale: 1.02 } : {}}
            whileTap={streakData.canCheckIn ? { scale: 0.98 } : {}}
            onClick={handleCheckIn}
            disabled={!streakData.canCheckIn || isChecking}
            className={`
              w-full py-5 px-6 rounded-2xl font-bold text-xl transition-all shadow-lg flex items-center justify-center gap-2
              ${streakData.canCheckIn
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            {isChecking ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                <Sparkles className="w-6 h-6" />
              </motion.div>
            ) : streakData.canCheckIn ? (
              <>
                <Zap className="w-6 h-6" />
                Check In & Gain Power
              </>
            ) : DEBUG_MODE ? (
              'Next check-in ready in 5 seconds'
            ) : (
              'Come back tomorrow!'
            )}
          </motion.button>

          {/* Stats Footer */}
          <div className="mt-6 flex justify-between text-sm">
            <div ref={powerStatRef} className="bg-slate-800/50 rounded-lg px-4 py-2 border border-slate-700">
              <p className="text-slate-500 text-xs">Total Power</p>
              <p className="text-lg font-bold text-amber-500 flex items-center gap-1">
                <Zap className="w-4 h-4" />
                {streakData.totalPowerLevel}
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg px-4 py-2 border border-slate-700">
              <p className="text-slate-500 text-xs">Best Streak</p>
              <p className="text-lg font-bold text-amber-500 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                {streakData.bestStreak} days
              </p>
            </div>
          </div>

          {/* Debug Mode Indicator */}
          {DEBUG_MODE && (
            <div className="mt-4 text-center text-xs text-purple-400 bg-purple-900/20 border border-purple-500/30 rounded-lg py-2">
              🧪 Debug Mode: 5-second cooldown between check-ins
            </div>
          )}
        </motion.div>

        {/* Particle overlay */}
        {particles.length > 0 && (
          <div className="fixed inset-0 z-[65] pointer-events-none">
            {particles.map(p => (
              <motion.div
                key={p.id}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.8 }}
                animate={{ x: p.dx, y: p.dy, opacity: [0, 1, 0], scale: [0.8, 1, 0.9] }}
                transition={{ duration: p.duration / 1000, ease: 'easeOut', delay: p.delay / 1000 }}
                className="absolute w-2 h-2 rounded-full"
                style={{ left: p.x, top: p.y, background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
              />
            ))}
          </div>
        )}

        {/* Epic celebration overlay (brought back) */}
        <AnimatePresence>
          {showCelebration && !reduceMotion && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[68] flex items-center justify-center pointer-events-none"
            >
              <div className="relative flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.1, opacity: 1 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="absolute -inset-24 rounded-full bg-amber-500/15 blur-2xl"
                />
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="text-8xl md:text-9xl drop-shadow-2xl"
                >
                  {showCelebration}
                </motion.div>
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute left-1/2 top-1/2 w-1 h-14 bg-amber-400/70 rounded-full origin-bottom"
                    style={{ rotate: i * 30 }}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: i * 0.03 }}
                  />
                ))}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                className="absolute mt-36 text-3xl font-bold text-white drop-shadow-lg text-center"
              >
                {celebrationLabel
                  ? `${celebrationLabel.toUpperCase()} UNLOCKED!`
                  : (
                    <>
                      {showCelebration === '🪫' && 'SPARK IGNITED!'}
                      {showCelebration === '🔋' && 'FULLY CHARGED!'}
                      {showCelebration === '⚡' && 'POWER USER UNLOCKED!'}
                    </>
                  )}
                {celebrationBoost != null && (
                  <div className="mt-2 text-amber-300 text-lg font-semibold">
                    +{celebrationBoost}% PL boost applied
                  </div>
                )}
              </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Milestone toast */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-6 right-6 z-[70] pointer-events-none"
            >
              <div className="bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 shadow-lg flex items-center gap-3">
                <span className="text-2xl">{showCelebration}</span>
                <div className="leading-tight">
                  <div className="text-white font-semibold text-sm">Milestone Achieved</div>
                  <div className="text-slate-400 text-xs">{celebrationLabel || BADGE_NAME[showCelebration] || 'Milestone'} unlocked{celebrationBoost != null ? ` · +${celebrationBoost}% PL applied` : ''}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mysteryReward && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
            >
              <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white rounded-3xl p-8 shadow-2xl border border-purple-500/30">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{ duration: 0.5 }}
                  className="text-6xl font-bold text-center mb-4 flex items-center justify-center gap-3"
                >
                  <Zap className="w-12 h-12" />
                  +{mysteryReward}
                </motion.div>
                <p className="text-xl font-medium text-center">
                  {mysteryReward >= 300 ? 'LEGENDARY BONUS!' :
                   mysteryReward >= 150 ? 'RARE BONUS!' :
                   'MYSTERY BONUS!'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}