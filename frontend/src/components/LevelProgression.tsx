/**
 * Level Progression Component
 * Display user's level, XP, and progress to next level
 */

import { useState, useEffect } from 'react';
import { TrendingUp, Zap, Target, Award } from 'lucide-react';
import gamificationService, { UserStats } from '../services/gamification.service';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

interface LevelProgressionProps {
  userId?: string;
  compact?: boolean; // Compact view for header/dashboard
  showDetails?: boolean; // Show detailed stats
}

export default function LevelProgression({
  userId,
  compact = false,
  showDetails = true,
}: LevelProgressionProps) {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const targetUserId = userId || user?.userId;

  useEffect(() => {
    loadStats();
  }, [targetUserId]);

  const loadStats = async () => {
    if (!targetUserId) return;

    try {
      setIsLoading(true);
      const data = await gamificationService.getUserStats(targetUserId);
      setStats(data);
    } catch (error) {
      console.error('Failed to load level stats:', error);
      toast.error('Failed to load level stats');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const levelBadge = gamificationService.getLevelBadge(stats.level);
  const levelColor = gamificationService.getLevelColor(stats.level);

  // Compact view for header or dashboard
  if (compact) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow p-4 border-2 border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-blue-500 p-2 rounded-full">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Level</p>
              <p className={`text-2xl font-bold ${levelColor}`}>
                {stats.level} {levelBadge}
              </p>
            </div>
          </div>
        </div>

        {/* Compact Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>{gamificationService.formatXP(stats.xpInCurrentLevel)}</span>
            <span>{stats.progressPercentage}%</span>
            <span>{gamificationService.formatXP(stats.xpNeededForNextLevel)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-1"
              style={{ width: `${stats.progressPercentage}%` }}
            >
              {stats.progressPercentage > 10 && (
                <Zap className="w-2.5 h-2.5 text-white" />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full level progression view
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-6 h-6" />
              <h2 className="text-xl font-bold">Level Progression</h2>
            </div>
            <p className="text-blue-100 text-sm">Your journey to mastery</p>
          </div>
          <div className="bg-white bg-opacity-20 px-6 py-3 rounded-lg backdrop-blur-sm">
            <p className="text-xs text-blue-100 mb-1 text-center">Current Level</p>
            <p className="text-5xl font-bold text-center">
              {stats.level}
            </p>
            <p className="text-2xl text-center">{levelBadge}</p>
          </div>
        </div>
      </div>

      {/* XP Progress */}
      <div className="p-6 border-b">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Experience Points
            </h3>
            <span className="text-sm text-gray-600">
              Level {stats.level} → {stats.level + 1}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-700 ease-out relative"
                style={{ width: `${stats.progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {stats.progressPercentage > 15 && (
                    <span className="text-white font-bold text-sm flex items-center gap-1">
                      <Zap className="w-4 h-4" />
                      {stats.progressPercentage}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* XP Labels */}
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-gray-600">
                {gamificationService.formatXP(stats.xpInCurrentLevel)}
              </span>
              <span className="font-semibold text-blue-600">
                {stats.xpNeededForNextLevel - stats.xpInCurrentLevel} XP to Level {stats.level + 1}
              </span>
              <span className="text-gray-600">
                {gamificationService.formatXP(stats.xpNeededForNextLevel)}
              </span>
            </div>
          </div>
        </div>

        {/* Total XP */}
        <div className="mt-4 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-600" />
              <span className="font-semibold text-gray-900">Total XP Earned</span>
            </div>
            <span className="text-xl font-bold text-yellow-600">
              {stats.experiencePoints.toLocaleString()} XP
            </span>
          </div>
        </div>
      </div>

      {/* Level Milestones */}
      {showDetails && (
        <div className="p-6 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Upcoming Milestones
          </h3>

          <div className="space-y-3">
            {[stats.level + 1, stats.level + 5, stats.level + 10].map((targetLevel) => {
              const xpNeeded = calculateTotalXPForLevel(targetLevel);
              const xpToGo = xpNeeded - stats.experiencePoints;
              const badge = gamificationService.getLevelBadge(targetLevel);

              return (
                <div
                  key={targetLevel}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <span className="text-2xl">{badge}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        Level {targetLevel}
                      </p>
                      <p className="text-sm text-gray-600">
                        {xpToGo > 0
                          ? `${xpToGo.toLocaleString()} XP needed`
                          : 'Already reached!'}
                      </p>
                    </div>
                  </div>
                  {xpToGo > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Total XP</p>
                      <p className="font-bold text-gray-900">
                        {xpNeeded.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* How to Earn XP */}
      {showDetails && (
        <div className="p-6 border-t">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            How to Earn XP
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="bg-green-100 p-2 rounded-full flex-shrink-0">
                <span className="text-xl">✅</span>
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">Complete Swaps</p>
                <p className="text-xs text-gray-600">
                  50 XP for each successful skill exchange
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="bg-blue-100 p-2 rounded-full flex-shrink-0">
                <span className="text-xl">⭐</span>
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">Receive Good Ratings</p>
                <p className="text-xs text-gray-600">
                  5 XP per star (up to 25 XP per review)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="bg-purple-100 p-2 rounded-full flex-shrink-0">
                <span className="text-xl">👨‍🏫</span>
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">Teach Hours</p>
                <p className="text-xs text-gray-600">
                  10 XP for each hour of teaching
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="bg-orange-100 p-2 rounded-full flex-shrink-0">
                <span className="text-xl">🏆</span>
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">Earn Badges</p>
                <p className="text-xs text-gray-600">
                  Bonus XP for achieving milestones
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to calculate total XP for a level
// Simplified version - should match backend logic
function calculateTotalXPForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += Math.floor(100 * Math.pow(1.5, i - 1));
  }
  return total;
}
