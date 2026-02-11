/**
 * Leaderboard Component
 * Display rankings by different metrics
 */

import { useState, useEffect } from 'react';
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  Coins,
  Star,
  BookOpen,
  Clock,
} from 'lucide-react';
import gamificationService, { LeaderboardEntry, RankData } from '../services/gamification.service';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

type MetricType = 'level' | 'coins' | 'rating' | 'swaps' | 'hoursTaught';

interface LeaderboardProps {
  defaultMetric?: MetricType;
  limit?: number;
  showUserRank?: boolean;
}

export default function Leaderboard({
  defaultMetric = 'level',
  limit = 10,
  showUserRank = true,
}: LeaderboardProps) {
  const { user } = useAuthStore();
  const [selectedMetric, setSelectedMetric] = useState<MetricType>(defaultMetric);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<RankData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [selectedMetric]);

  const loadLeaderboard = async () => {
    try {
      setIsLoading(true);
      const data = await gamificationService.getLeaderboard(selectedMetric, limit);
      setLeaderboard(data);

      // Load user's rank if logged in
      if (showUserRank && user) {
        const rankData = await gamificationService.getUserRank(selectedMetric);
        setUserRank(rankData);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  const metrics = [
    {
      key: 'level' as MetricType,
      label: 'Level',
      icon: TrendingUp,
      color: 'blue',
      description: 'Highest levels',
    },
    {
      key: 'coins' as MetricType,
      label: 'Coins',
      icon: Coins,
      color: 'yellow',
      description: 'Most SkillCoins',
    },
    {
      key: 'rating' as MetricType,
      label: 'Rating',
      icon: Star,
      color: 'purple',
      description: 'Highest rated',
    },
    {
      key: 'swaps' as MetricType,
      label: 'Swaps',
      icon: BookOpen,
      color: 'green',
      description: 'Most swaps completed',
    },
    {
      key: 'hoursTaught' as MetricType,
      label: 'Teaching',
      icon: Clock,
      color: 'orange',
      description: 'Most hours taught',
    },
  ];

  const selectedMetricData = metrics.find((m) => m.key === selectedMetric);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: '🥇', color: 'text-yellow-500', label: '1st' };
    if (rank === 2) return { icon: '🥈', color: 'text-gray-400', label: '2nd' };
    if (rank === 3) return { icon: '🥉', color: 'text-orange-600', label: '3rd' };
    return { icon: `#${rank}`, color: 'text-gray-600', label: `${rank}th` };
  };

  const getMetricValue = (entry: LeaderboardEntry) => {
    switch (selectedMetric) {
      case 'level':
        return `Level ${entry.level}`;
      case 'coins':
        return gamificationService.formatCoins(entry.coins);
      case 'rating':
        return `${entry.rating.toFixed(1)} ⭐`;
      case 'swaps':
        return `${entry.completedSwaps} swaps`;
      case 'hoursTaught':
        return `${entry.totalHoursTaught}h taught`;
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-t-lg">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-7 h-7" />
          <h2 className="text-2xl font-bold">Leaderboard</h2>
        </div>
        <p className="text-indigo-100 text-sm">
          Top performers in the TejIndiacommunity
        </p>
      </div>

      {/* Metric Tabs */}
      <div className="border-b bg-gray-50 overflow-x-auto">
        <div className="flex p-2 gap-2 min-w-max">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            const isSelected = selectedMetric === metric.key;

            return (
              <button
                key={metric.key}
                onClick={() => setSelectedMetric(metric.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  isSelected
                    ? `bg-${metric.color}-100 text-${metric.color}-700 border-2 border-${metric.color}-300`
                    : 'bg-white text-gray-600 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{metric.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* User's Rank Card */}
      {showUserRank && userRank && user && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b">
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-blue-300 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <Award className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Your Rank</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getRankBadge(userRank.rank).icon} {getRankBadge(userRank.rank).label}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">{selectedMetricData?.label}</p>
              <p className="text-xl font-bold text-blue-600">
                {selectedMetric === 'level' && `Level ${userRank.metricValue}`}
                {selectedMetric === 'coins' && gamificationService.formatCoins(userRank.metricValue)}
                {selectedMetric === 'rating' && `${userRank.metricValue.toFixed(1)} ⭐`}
                {selectedMetric === 'swaps' && `${userRank.metricValue} swaps`}
                {selectedMetric === 'hoursTaught' && `${userRank.metricValue}h`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">No rankings available</p>
            <p className="text-sm text-gray-500">
              Be the first to earn your place on the leaderboard!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => {
              const rankBadge = getRankBadge(entry.rank);
              const isTopThree = entry.rank <= 3;
              const isCurrentUser = user && entry.userId === user.userId;

              return (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                    isCurrentUser
                      ? 'bg-blue-50 border-2 border-blue-300'
                      : isTopThree
                      ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  {/* Rank and User Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Rank Badge */}
                    <div
                      className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                        isTopThree
                          ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-md'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {entry.rank <= 3 ? rankBadge.icon : entry.rank}
                    </div>

                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {entry.avatar ? (
                        <img
                          src={entry.avatar}
                          alt={entry.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-lg border-2 border-white shadow">
                          {entry.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* User Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">
                          {entry.name}
                        </p>
                        {isCurrentUser && (
                          <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                        {isTopThree && (
                          <span className="flex-shrink-0">
                            {entry.rank === 1 && <Medal className="w-5 h-5 text-yellow-500" />}
                            {entry.rank === 2 && <Medal className="w-5 h-5 text-gray-400" />}
                            {entry.rank === 3 && <Medal className="w-5 h-5 text-orange-600" />}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {entry.city && entry.state
                          ? `${entry.city}, ${entry.state}`
                          : 'India'}
                      </p>
                    </div>
                  </div>

                  {/* Metric Value */}
                  <div className="text-right flex-shrink-0 ml-4">
                    <p
                      className={`text-xl font-bold ${
                        isTopThree ? 'text-orange-600' : 'text-gray-900'
                      }`}
                    >
                      {getMetricValue(entry)}
                    </p>
                    {selectedMetric === 'level' && (
                      <p className="text-xs text-gray-600">
                        {gamificationService.formatXP(entry.experiencePoints)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-gray-50 border-t rounded-b-lg">
        <p className="text-sm text-gray-600 text-center">
          <strong>Rankings update in real-time.</strong> Keep learning and teaching to
          climb the leaderboard!
        </p>
      </div>
    </div>
  );
}
