/**
 * Badge Showcase Component
 * Display user's earned badges and locked badges
 */

import { useState, useEffect } from 'react';
import { Award, Lock, Trophy, Star, TrendingUp } from 'lucide-react';
import gamificationService, { Badge } from '../services/gamification.service';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

interface BadgeShowcaseProps {
  userId?: string;
  compact?: boolean; // Compact view for profile
  maxDisplay?: number; // Max badges to display in compact mode
}

export default function BadgeShowcase({
  userId,
  compact = false,
  maxDisplay = 6,
}: BadgeShowcaseProps) {
  const { user } = useAuthStore();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const targetUserId = userId || user?.userId;

  useEffect(() => {
    loadBadges();
  }, [targetUserId]);

  const loadBadges = async () => {
    if (!targetUserId) return;

    try {
      setIsLoading(true);
      const stats = await gamificationService.getUserStats(targetUserId);
      setBadges(stats.badges);
    } catch (error) {
      console.error('Failed to load badges:', error);
      toast.error('Failed to load badges');
    } finally {
      setIsLoading(false);
    }
  };

  const formatBadgeDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getBadgeIcon = (icon: string) => {
    // Badge icons are emojis or icon names
    if (icon.length <= 2) return icon; // Emoji
    return '🏆'; // Default trophy
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Compact view for profile
  if (compact) {
    const displayBadges = badges.slice(0, maxDisplay);
    const remainingCount = Math.max(0, badges.length - maxDisplay);

    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Badges ({badges.length})
          </h3>
        </div>

        {badges.length === 0 ? (
          <div className="text-center py-8">
            <Lock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No badges earned yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {displayBadges.map((badge) => (
              <div
                key={badge.badgeId}
                className="flex flex-col items-center p-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-200 hover:scale-105 transition-transform cursor-pointer"
                onClick={() => setSelectedBadge(badge)}
                title={badge.name}
              >
                <span className="text-3xl mb-1">{getBadgeIcon(badge.icon)}</span>
                <p className="text-xs font-medium text-gray-900 text-center truncate w-full">
                  {badge.name}
                </p>
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                <p className="text-2xl font-bold text-gray-600">+{remainingCount}</p>
                <p className="text-xs text-gray-500">more</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full showcase view
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-6 h-6" />
              <h2 className="text-xl font-bold">Badge Collection</h2>
            </div>
            <p className="text-yellow-100 text-sm">
              Your achievements and milestones
            </p>
          </div>
          <div className="bg-white bg-opacity-20 px-4 py-2 rounded-lg backdrop-blur-sm">
            <p className="text-xs text-yellow-100 mb-1">Earned</p>
            <p className="text-3xl font-bold">{badges.length}</p>
            <p className="text-xs text-yellow-100">Badges</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 p-6 border-b bg-gray-50">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-yellow-600 mb-1">
            <Star className="w-5 h-5" />
            <p className="text-2xl font-bold">{badges.length}</p>
          </div>
          <p className="text-xs text-gray-600">Total Badges</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
            <TrendingUp className="w-5 h-5" />
            <p className="text-2xl font-bold">
              {badges.filter(b => {
                const earnedDate = new Date(b.earnedAt);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return earnedDate >= thirtyDaysAgo;
              }).length}
            </p>
          </div>
          <p className="text-xs text-gray-600">Last 30 Days</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
            <Award className="w-5 h-5" />
            <p className="text-2xl font-bold">
              {badges.length > 0 ? Math.floor((badges.length / 20) * 100) : 0}%
            </p>
          </div>
          <p className="text-xs text-gray-600">Collection Progress</p>
        </div>
      </div>

      {/* Badge Grid */}
      <div className="p-6">
        {badges.length === 0 ? (
          <div className="text-center py-16">
            <Lock className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">No badges earned yet</p>
            <p className="text-sm text-gray-500 mb-6">
              Complete swaps, level up, and achieve milestones to earn badges!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <div className="bg-gray-50 p-4 rounded-lg text-left">
                <p className="font-semibold text-gray-900 mb-2">🎯 Complete Swaps</p>
                <p className="text-sm text-gray-600">
                  Earn badges for completing 1, 5, 10, 25, 50, and 100 skill swaps
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-left">
                <p className="font-semibold text-gray-900 mb-2">⭐ Level Up</p>
                <p className="text-sm text-gray-600">
                  Unlock badges as you reach levels 5, 10, 25, 50, and beyond
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-left">
                <p className="font-semibold text-gray-900 mb-2">👨‍🏫 Teaching Hours</p>
                <p className="text-sm text-gray-600">
                  Get recognized for teaching 10, 50, 100, and 500+ hours
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-left">
                <p className="font-semibold text-gray-900 mb-2">🌟 High Ratings</p>
                <p className="text-sm text-gray-600">
                  Achieve 4.5 and 5.0 average ratings to earn elite badges
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {badges.map((badge) => (
              <div
                key={badge.badgeId}
                className="group relative"
                onClick={() => setSelectedBadge(badge)}
              >
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-200 p-4 hover:scale-105 transition-transform cursor-pointer shadow-sm hover:shadow-md">
                  <div className="flex flex-col items-center">
                    <span className="text-5xl mb-2 group-hover:animate-bounce">
                      {getBadgeIcon(badge.icon)}
                    </span>
                    <p className="font-semibold text-sm text-gray-900 text-center mb-1">
                      {badge.name}
                    </p>
                    <p className="text-xs text-gray-500 text-center line-clamp-2">
                      {badge.description}
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-yellow-200">
                    <p className="text-xs text-gray-500 text-center">
                      Earned {formatBadgeDate(badge.earnedAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <span className="text-7xl mb-4 inline-block animate-bounce">
                {getBadgeIcon(selectedBadge.icon)}
              </span>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedBadge.name}
              </h3>
              <p className="text-gray-600 mb-4">{selectedBadge.description}</p>
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>Earned on:</strong>{' '}
                  {formatBadgeDate(selectedBadge.earnedAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedBadge(null)}
                className="mt-6 w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold py-2 px-4 rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
