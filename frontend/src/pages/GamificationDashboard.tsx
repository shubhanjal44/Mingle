/**
 * Gamification Dashboard Page
 * Main page showing all gamification features
 */

import { useState } from 'react';
import { Gamepad2, TrendingUp, Award, Coins, Trophy } from 'lucide-react';
import LevelProgression from '../components/LevelProgression';
import SkillCoinsWallet from '../components/SkillCoinsWallet';
import BadgeShowcase from '../components/BadgeShowcase';
import Leaderboard from '../components/Leaderboard';

type TabType = 'overview' | 'badges' | 'wallet' | 'leaderboard';

export default function GamificationDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    {
      key: 'overview' as TabType,
      label: 'Overview',
      icon: Gamepad2,
      color: 'blue',
    },
    {
      key: 'badges' as TabType,
      label: 'Badges',
      icon: Award,
      color: 'yellow',
    },
    {
      key: 'wallet' as TabType,
      label: 'SkillCoins',
      icon: Coins,
      color: 'orange',
    },
    {
      key: 'leaderboard' as TabType,
      label: 'Leaderboard',
      icon: Trophy,
      color: 'purple',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg backdrop-blur-sm">
              <Gamepad2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Gamification Center</h1>
              <p className="text-indigo-100 mt-1">
                Track your progress, earn rewards, and compete with others
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-lg'
                      : 'bg-white bg-opacity-10 text-white hover:bg-opacity-20'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <LevelProgression compact={false} showDetails={true} />
              <div className="space-y-6">
                <SkillCoinsWallet compact={true} />
                <BadgeShowcase compact={true} maxDisplay={6} />
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                Your Progress
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      This Week
                    </span>
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">+150 XP</p>
                  <p className="text-xs text-gray-600 mt-1">
                    From 2 completed swaps
                  </p>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-lg border-2 border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Coins Earned
                    </span>
                    <Coins className="w-4 h-4 text-yellow-600" />
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">+50</p>
                  <p className="text-xs text-gray-600 mt-1">This month</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border-2 border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      New Badges
                    </span>
                    <Award className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-purple-600">2</p>
                  <p className="text-xs text-gray-600 mt-1">Recently earned</p>
                </div>
              </div>
            </div>

            {/* Mini Leaderboard */}
            <Leaderboard limit={5} showUserRank={true} />
          </div>
        )}

        {/* Badges Tab */}
        {activeTab === 'badges' && (
          <div>
            <BadgeShowcase compact={false} />
          </div>
        )}

        {/* Wallet Tab */}
        {activeTab === 'wallet' && (
          <div>
            <SkillCoinsWallet compact={false} />
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <Leaderboard limit={10} showUserRank={true} />

            {/* Leaderboard Info */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200 p-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-indigo-600" />
                About Leaderboards
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>🏆 Rankings update in real-time</strong>
                  </p>
                  <p className="text-xs text-gray-600">
                    Your position changes instantly as you and others earn points
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>📊 Multiple metrics tracked</strong>
                  </p>
                  <p className="text-xs text-gray-600">
                    Compete in different categories based on your strengths
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>🎯 Fair competition</strong>
                  </p>
                  <p className="text-xs text-gray-600">
                    Only active, verified users appear on leaderboards
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>⭐ Earn recognition</strong>
                  </p>
                  <p className="text-xs text-gray-600">
                    Top performers get special badges and profile highlights
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
