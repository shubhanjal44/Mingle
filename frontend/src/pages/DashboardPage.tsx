import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import swapsService from '../services/swaps.service';
import matchingService from '../services/matching.service';
import type { Swap } from '../services/swaps.service';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [recentSwaps, setRecentSwaps] = useState<Swap[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [swapsRes, matchesRes] = await Promise.all([
        swapsService.getSwaps({ limit: 5 }),
        matchingService.findMatches({ limit: 10 }),
      ]);

      if (swapsRes.success) {
        setRecentSwaps(swapsRes.data.swaps);
      }
      if (matchesRes.success) {
        setMatchCount(matchesRes.data.count || 0);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening with your skill swaps today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Swaps</p>
              <p className="text-3xl font-bold text-blue-600">{user?.completedSwaps || 0}</p>
            </div>
            <div className="text-blue-600 text-4xl">🔄</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">SkillCoins</p>
              <p className="text-3xl font-bold text-yellow-600">{user?.skillCoins || 0}</p>
            </div>
            <div className="text-yellow-600 text-4xl">💰</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Level</p>
              <p className="text-3xl font-bold text-purple-600">{user?.level || 1}</p>
            </div>
            <div className="text-purple-600 text-4xl">⭐</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Potential Matches</p>
              <p className="text-3xl font-bold text-green-600">{matchCount}</p>
            </div>
            <div className="text-green-600 text-4xl">🎯</div>
          </div>
        </div>
      </div>

      {/* Recent Swaps */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Swaps</h2>
          <Link to="/swaps" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View All →
          </Link>
        </div>

        {isLoading ? (
          <p className="text-gray-600 text-center py-8">Loading...</p>
        ) : recentSwaps.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No swaps yet</p>
            <Link to="/matches" className="btn-primary">
              Find Matches
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentSwaps.map((swap) => (
              <div key={swap.swapId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">
                      {swap.initiatorSkill.name} ↔ {swap.receiverSkill.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      with {swap.receiver.name || swap.initiator.name}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    swap.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    swap.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {swap.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/matches"
          className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Find Matches</h3>
          <p className="text-sm text-gray-600">
            Discover people who want to learn what you teach and teach what you want to learn
          </p>
        </Link>

        <Link
          to="/skills"
          className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Skills</h3>
          <p className="text-sm text-gray-600">
            Add or update the skills you can teach and want to learn
          </p>
        </Link>

        <Link
          to="/profile"
          className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Update Profile</h3>
          <p className="text-sm text-gray-600">
            Keep your profile up to date to get better match recommendations
          </p>
        </Link>
      </div>
    </div>
  );
}
