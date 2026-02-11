/**
 * SkillCoins Wallet Component
 * Display user's coin balance and transaction history
 */

import { useState, useEffect } from 'react';
import { Coins, TrendingUp, TrendingDown, History, Wallet } from 'lucide-react';
import gamificationService from '../services/gamification.service';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

interface SkillCoinsWalletProps {
  userId?: string;
  compact?: boolean; // Compact view for dashboard
}

export default function SkillCoinsWallet({
  userId,
  compact = false,
}: SkillCoinsWalletProps) {
  const { user } = useAuthStore();
  const [coins, setCoins] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const targetUserId = userId || user?.userId;

  useEffect(() => {
    loadWalletData();
  }, [targetUserId]);

  const loadWalletData = async () => {
    if (!targetUserId) return;

    try {
      setIsLoading(true);
      const [stats, transactionData] = await Promise.all([
        gamificationService.getUserStats(targetUserId),
        gamificationService.getCoinTransactions(targetUserId),
      ]);

      setCoins(stats.coins);
      setTransactions(transactionData);
    } catch (error) {
      console.error('Failed to load wallet data:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-12 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Compact view for dashboard
  if (compact) {
    return (
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg shadow p-4 border-2 border-yellow-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-400 p-3 rounded-full">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">SkillCoins Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                {gamificationService.formatCoins(coins)}
              </p>
            </div>
          </div>
          <Coins className="w-12 h-12 text-yellow-500 opacity-50" />
        </div>
      </div>
    );
  }

  // Full wallet view
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-6 h-6" />
              <h2 className="text-xl font-bold">SkillCoins Wallet</h2>
            </div>
            <p className="text-yellow-100 text-sm">Your digital currency</p>
          </div>
          <div className="bg-white bg-opacity-20 px-4 py-2 rounded-lg backdrop-blur-sm">
            <p className="text-xs text-yellow-100 mb-1">Balance</p>
            <p className="text-3xl font-bold">{coins.toLocaleString()}</p>
            <p className="text-xs text-yellow-100">SkillCoins</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 p-6 border-b">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <p className="text-2xl font-bold">0</p>
          </div>
          <p className="text-xs text-gray-600">Earned This Week</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
            <TrendingDown className="w-4 h-4" />
            <p className="text-2xl font-bold">0</p>
          </div>
          <p className="text-xs text-gray-600">Spent This Week</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
            <History className="w-4 h-4" />
            <p className="text-2xl font-bold">{transactions.length}</p>
          </div>
          <p className="text-xs text-gray-600">Total Transactions</p>
        </div>
      </div>

      {/* How to Earn Section */}
      <div className="p-6 bg-gray-50 border-b">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Coins className="w-5 h-5 text-yellow-500" />
          How to Earn SkillCoins
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <div className="bg-green-100 p-2 rounded-full flex-shrink-0">
              <span className="text-lg">✅</span>
            </div>
            <div>
              <p className="font-medium text-sm text-gray-900">Complete Swaps</p>
              <p className="text-xs text-gray-600">Earn coins for each successful skill swap</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="bg-blue-100 p-2 rounded-full flex-shrink-0">
              <span className="text-lg">⭐</span>
            </div>
            <div>
              <p className="font-medium text-sm text-gray-900">Level Up</p>
              <p className="text-xs text-gray-600">Get 10 coins per level as bonus</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="bg-purple-100 p-2 rounded-full flex-shrink-0">
              <span className="text-lg">🏆</span>
            </div>
            <div>
              <p className="font-medium text-sm text-gray-900">Earn Badges</p>
              <p className="text-xs text-gray-600">Some badges come with coin rewards</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="bg-orange-100 p-2 rounded-full flex-shrink-0">
              <span className="text-lg">📝</span>
            </div>
            <div>
              <p className="font-medium text-sm text-gray-900">Leave Reviews</p>
              <p className="text-xs text-gray-600">Get rewarded for helpful reviews</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-gray-700" />
          Transaction History
        </h3>

        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">No transactions yet</p>
            <p className="text-sm text-gray-500">
              Start earning SkillCoins by completing swaps!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      transaction.type === 'earned'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {transaction.type === 'earned' ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-xs text-gray-500">{transaction.date}</p>
                  </div>
                </div>
                <div
                  className={`font-bold text-lg ${
                    transaction.type === 'earned' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {transaction.type === 'earned' ? '+' : '-'}
                  {transaction.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Coming Soon Message */}
      {transactions.length === 0 && (
        <div className="p-4 bg-blue-50 border-t border-blue-100">
          <p className="text-sm text-blue-800 text-center">
            💡 <strong>Coming Soon:</strong> Spend SkillCoins on premium features, profile boosts, and
            exclusive badges!
          </p>
        </div>
      )}
    </div>
  );
}
