'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Lock, Gift, Check, Sparkles, Calendar, Zap, TrendingUp } from 'lucide-react';

interface StreakData {
  currentStreak: number;
  lastCheckIn: string | null;
  totalPowerLevel: number;
  unlockedBadges: string[];
  canCheckIn: boolean;
  bestStreak: number;
}

const REWARDS = [
  { day: 1, points: 20 },
  { day: 2, points: 30 },
  { day: 3, points: 40, badge: '🪫' },
  { day: 4, points: 50 },
  { day: 5, points: 70, badge: '🔋' },
  { day: 6, points: 70 },
  { day: 7, points: 100, special: 'mystery' },
  { day: 14, points: 200, badge: '⚡' },
];

const ALL_BADGES = [
  { badge: '🪫', name: 'Spark', days: 3, description: '3-day streak' },
  { badge: '🔋', name: 'Charged', days: 5, description: '5-day streak' },
  { badge: '⚡', name: 'Power User', days: 14, description: '14-day streak' },
];

const getEncouragingMessage = (streak: number): string => {
  if (streak === 0) return "Start your power journey today! 🚀";
  if (streak === 1) return "Excellent start! Tomorrow's power boost is even better!";
  if (streak === 2) return "Building momentum! Spark badge tomorrow! 🪫";
  if (streak === 3) return "Spark achieved! You're officially powered up! 🔥";
  if (streak === 4) return "One day away from Charged status! ⚡";
  if (streak === 5) return "Charged up! You're unstoppable now! 🔋";
  if (streak === 6) return "Mystery box tomorrow! Massive power awaits! 🎁";
  if (streak === 7) return "Week champion! Claim your mystery power! 🏆";
  if (streak < 14) return `Power User in ${14 - streak} days! Keep grinding! 💪`;
  if (streak === 14) return "POWER USER STATUS! You're in the elite! ⚡";
  if (streak < 30) return `Legendary ${streak}-day streak! You're dominating! 🌟`;
  if (streak < 50) return `Incredible ${streak} days! True dedication! 💎`;
  if (streak < 100) return `${100 - streak} days to CENTURY! History awaits! 👑`;
  return `Day ${streak}! Absolute legend! 🏅`;
};

const DEBUG_MODE = true; // Set to false for production

export default function StreakModal() {
  const [isOpen, setIsOpen] = useState(true);
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    lastCheckIn: null,
    totalPowerLevel: 0,
    unlockedBadges: [],
    canCheckIn: true,
    bestStreak: 0,
  });
  const [isChecking, setIsChecking] = useState(false);
  const [showCelebration, setShowCelebration] = useState<string | null>(null);
  const [mysteryReward, setMysteryReward] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('streakData');
    if (stored) {
      const data = JSON.parse(stored);
      if (!data.bestStreak) {
        data.bestStreak = data.currentStreak;
      }
      setStreakData(data);
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

  const handleCheckIn = async () => {
    if (!streakData.canCheckIn || isChecking) return;

    setIsChecking(true);
    await new Promise(resolve => setTimeout(resolve, 600));

    const newStreak = streakData.currentStreak + 1;
    const todayReward = REWARDS.find(r => r.day === newStreak) || REWARDS[6];
    let pointsToAdd = todayReward.points;

    if (todayReward.special === 'mystery') {
      const roll = Math.random();
      if (roll < 0.05) {
        pointsToAdd = 500;
        setMysteryReward(500);
      } else if (roll < 0.20) {
        pointsToAdd = 300;
        setMysteryReward(300);
      } else if (roll < 0.40) {
        pointsToAdd = 150;
        setMysteryReward(150);
      } else {
        pointsToAdd = 100;
        setMysteryReward(100);
      }
      setTimeout(() => setMysteryReward(null), 2500);
    }

    const newBestStreak = Math.max(newStreak, streakData.bestStreak || 0);
    const newData = {
      currentStreak: newStreak,
      lastCheckIn: new Date().toISOString(),
      totalPowerLevel: streakData.totalPowerLevel + pointsToAdd,
      unlockedBadges: [...streakData.unlockedBadges],
      canCheckIn: false,
      bestStreak: newBestStreak,
    };

    if (todayReward.badge && !newData.unlockedBadges.includes(todayReward.badge)) {
      newData.unlockedBadges.push(todayReward.badge);
      setShowCelebration(todayReward.badge);
      setTimeout(() => setShowCelebration(null), 3000);
    }

    setStreakData(newData);
    localStorage.setItem('streakData', JSON.stringify(newData));
    setIsChecking(false);

    if (DEBUG_MODE) {
      setTimeout(() => {
        setStreakData(prev => ({ ...prev, canCheckIn: true }));
      }, 5000);
    }
  };

  const getUpcomingRewards = () => {
    const rewards = [];
    for (let i = 0; i < 7; i++) {
      const dayNum = streakData.currentStreak + i;
      const reward = REWARDS.find(r => r.day === dayNum) || {
        day: dayNum,
        points: 70 + Math.floor(dayNum / 7) * 10
      };

      rewards.push({
        ...reward,
        isToday: i === 0,
        isTomorrow: i === 1,
        isCollected: false,
        dayNum
      });
    }
    return rewards;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 p-8 shadow-2xl"
        >
          {/* Header with Flame Icon */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center"
                >
                  <Flame className="w-9 h-9 text-white" />
                </motion.div>
                <div className="absolute -bottom-1 -right-1 bg-zinc-900 rounded-full px-2 py-0.5 border border-zinc-700">
                  <span className="text-sm font-bold text-amber-500">{streakData.currentStreak}</span>
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">
                  {streakData.currentStreak} day streak
                </h2>
                <p className="text-zinc-400 text-sm mt-1">
                  {getEncouragingMessage(streakData.currentStreak)}
                </p>
              </div>
            </div>
          </div>

          {/* Get X Power Level tomorrow message */}
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6 text-center">
            <p className="text-xl font-bold text-white flex items-center justify-center gap-2">
              <Zap className="w-6 h-6 text-amber-500" />
              Get {REWARDS[Math.min(streakData.currentStreak, REWARDS.length - 1)].points} Power Level tomorrow!
            </p>
          </div>

          {/* Badges Progress */}
          <div className="flex justify-center gap-3 mb-6">
            {ALL_BADGES.map((badge) => {
              const isUnlocked = streakData.unlockedBadges.includes(badge.badge);
              const progress = Math.min(100, (streakData.currentStreak / badge.days) * 100);

              return (
                <motion.div
                  key={badge.badge}
                  className={`relative flex flex-col items-center p-3 rounded-xl transition-all ${
                    isUnlocked
                      ? 'bg-gradient-to-b from-amber-500/20 to-amber-500/10 border border-amber-500/30'
                      : 'bg-zinc-800/50 border border-zinc-700'
                  }`}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className={`text-3xl mb-1 ${!isUnlocked && 'opacity-30 grayscale'}`}>
                    {badge.badge}
                  </div>
                  <p className="text-xs font-medium text-zinc-300">{badge.name}</p>
                  <p className="text-xs text-zinc-500">{badge.description}</p>
                  {!isUnlocked && (
                    <div className="w-full bg-zinc-700 rounded-full h-1.5 mt-2 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Horizontal Scrolling Rewards */}
          <div className="mb-6">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {getUpcomingRewards().map((reward, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex-shrink-0"
                >
                  <div
                    className={`relative w-32 p-4 rounded-xl transition-all ${
                      reward.isToday
                        ? 'bg-gradient-to-b from-amber-500/20 to-amber-500/10 border-2 border-amber-500 shadow-xl shadow-amber-500/20 scale-105'
                        : reward.isTomorrow
                        ? 'bg-zinc-800 border-2 border-amber-500/50'
                        : 'bg-zinc-800/50 border border-zinc-700'
                    }`}
                  >
                    <div className="text-center">
                      <p className="text-xs font-medium text-zinc-400 mb-2">
                        {reward.isToday ? 'Today' : reward.isTomorrow ? 'Tomorrow' : `Day ${reward.dayNum}`}
                      </p>

                      <div className="flex justify-center mb-2">
                        {reward.special === 'mystery' ? (
                          <Gift className="w-10 h-10 text-purple-400" />
                        ) : reward.badge ? (
                          <span className="text-3xl">{reward.badge}</span>
                        ) : (
                          <Zap className="w-10 h-10 text-amber-500" />
                        )}
                      </div>

                      <p className="text-2xl font-bold text-white">{reward.points}</p>
                      <p className="text-xs text-zinc-500 mt-1">Power Level</p>

                      {reward.isToday && !streakData.canCheckIn && (
                        <Check className="absolute top-2 right-2 w-5 h-5 text-green-500" />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Check-In Button */}
          <motion.button
            whileHover={streakData.canCheckIn ? { scale: 1.02 } : {}}
            whileTap={streakData.canCheckIn ? { scale: 0.98 } : {}}
            onClick={handleCheckIn}
            disabled={!streakData.canCheckIn || isChecking}
            className={`
              w-full py-5 px-6 rounded-2xl font-bold text-xl transition-all shadow-lg flex items-center justify-center gap-2
              ${streakData.canCheckIn
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
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
            <div className="bg-zinc-800/50 rounded-lg px-4 py-2 border border-zinc-700">
              <p className="text-zinc-500 text-xs">Total Power</p>
              <p className="text-lg font-bold text-amber-500 flex items-center gap-1">
                <Zap className="w-4 h-4" />
                {streakData.totalPowerLevel}
              </p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg px-4 py-2 border border-zinc-700">
              <p className="text-zinc-500 text-xs">Best Streak</p>
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

        {/* Celebrations */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
            >
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.5, 1],
                }}
                transition={{ duration: 2 }}
                className="text-9xl drop-shadow-2xl"
              >
                {showCelebration}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="absolute mt-36 text-3xl font-bold text-white drop-shadow-lg text-center"
              >
                {showCelebration === '🪫' && 'SPARK IGNITED!'}
                {showCelebration === '🔋' && 'FULLY CHARGED!'}
                {showCelebration === '⚡' && 'POWER USER UNLOCKED!'}
              </motion.div>
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
                  {mysteryReward >= 300 ? 'LEGENDARY POWER!' :
                   mysteryReward >= 150 ? 'RARE POWER!' :
                   'MYSTERY POWER!'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}