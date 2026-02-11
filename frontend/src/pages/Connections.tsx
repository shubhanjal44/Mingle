/**
 * Connections Page
 * Manage user connections, discover new people to connect with
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Users,
  UserPlus,
  UserMinus,
  Search,
  TrendingUp,
  MapPin,
  Star,
  Award,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import {
  getUserConnections,
  getUserFollowers,
  getSuggestedConnections,
  searchUsers,
  connectToUser,
  disconnectFromUser,
  getConnectionStats,
  ConnectionUser,
  UserConnection,
  ConnectionStats,
  formatConnectionDate,
  getUserLocation,
} from '../services/connection.service';
import { useAuthStore } from '../stores/authStore';

type TabType = 'following' | 'followers' | 'suggestions' | 'search';

export default function Connections() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabType>('following');
  const [following, setFollowing] = useState<UserConnection[]>([]);
  const [followers, setFollowers] = useState<UserConnection[]>([]);
  const [suggestions, setSuggestions] = useState<ConnectionUser[]>([]);
  const [searchResults, setSearchResults] = useState<ConnectionUser[]>([]);
  const [stats, setStats] = useState<ConnectionStats>({ following: 0, followers: 0, mutual: 0 });

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  const loadStats = async () => {
    try {
      const data = await getConnectionStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadTabData = async () => {
    try {
      setIsLoading(true);

      switch (activeTab) {
        case 'following':
          const followingData = await getUserConnections();
          setFollowing(followingData);
          break;
        case 'followers':
          const followersData = await getUserFollowers();
          setFollowers(followersData);
          break;
        case 'suggestions':
          const suggestionsData = await getSuggestedConnections(20);
          setSuggestions(suggestionsData);
          break;
        case 'search':
          // Search is handled separately
          break;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load connections');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      toast.error('Please enter at least 2 characters to search');
      return;
    }

    try {
      setIsSearching(true);
      const results = await searchUsers(searchQuery.trim());
      setSearchResults(results);
    } catch (error: any) {
      console.error('Search failed:', error);
      toast.error(error.response?.data?.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleConnect = async (userId: string) => {
    try {
      await connectToUser(userId);
      toast.success('Successfully connected!');

      // Refresh data and stats
      await loadStats();
      await loadTabData();

      // Update search results if in search tab
      if (activeTab === 'search' && searchResults.length > 0) {
        setSearchResults((prev) =>
          prev.map((user) =>
            user.userId === userId ? { ...user, isConnected: true } : user
          )
        );
      }
    } catch (error: any) {
      console.error('Failed to connect:', error);
      toast.error(error.response?.data?.message || 'Failed to connect');
    }
  };

  const handleDisconnect = async (userId: string) => {
    const confirmed = window.confirm('Are you sure you want to disconnect from this user?');
    if (!confirmed) return;

    try {
      await disconnectFromUser(userId);
      toast.success('Successfully disconnected');

      // Refresh data and stats
      await loadStats();
      await loadTabData();

      // Update search results if in search tab
      if (activeTab === 'search' && searchResults.length > 0) {
        setSearchResults((prev) =>
          prev.map((user) =>
            user.userId === userId ? { ...user, isConnected: false } : user
          )
        );
      }
    } catch (error: any) {
      console.error('Failed to disconnect:', error);
      toast.error(error.response?.data?.message || 'Failed to disconnect');
    }
  };

  const UserCard = ({ user, connectedAt, showConnectButton = true }: {
    user: ConnectionUser;
    connectedAt?: string;
    showConnectButton?: boolean;
  }) => {
    const isOwnProfile = user.userId === user?.userId;

    return (
      <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-all">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0 cursor-pointer"
              onClick={() => navigate(`/profile/${user.userId}`)}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 cursor-pointer"
              onClick={() => navigate(`/profile/${user.userId}`)}
            >
              <Users className="w-8 h-8 text-white" />
            </div>
          )}

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <h3
              className="text-lg font-bold text-gray-900 hover:text-blue-600 cursor-pointer line-clamp-1"
              onClick={() => navigate(`/profile/${user.userId}`)}
            >
              {user.name}
            </h3>

            {user.bio && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">{user.bio}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
              {(user.city || user.state) && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{getUserLocation(user)}</span>
                </div>
              )}

              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500" />
                <span>{user.rating.toFixed(1)} rating</span>
              </div>

              {user.level && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <span>Level {user.level}</span>
                </div>
              )}

              {user.completedSwaps > 0 && (
                <div className="flex items-center gap-1">
                  <Award className="w-4 h-4 text-purple-500" />
                  <span>{user.completedSwaps} swaps</span>
                </div>
              )}
            </div>

            {connectedAt && (
              <p className="text-xs text-gray-500 mt-2">{formatConnectionDate(connectedAt)}</p>
            )}
          </div>

          {/* Action Button */}
          {!isOwnProfile && showConnectButton && (
            <div className="flex-shrink-0">
              {user.isConnected ? (
                <button
                  onClick={() => handleDisconnect(user.userId)}
                  className="flex items-center gap-2 px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
                >
                  <UserMinus className="w-4 h-4" />
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => handleConnect(user.userId)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Connect
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Connections</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Following</p>
                <p className="text-3xl font-bold">{stats.following}</p>
              </div>
              <Users className="w-12 h-12 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Followers</p>
                <p className="text-3xl font-bold">{stats.followers}</p>
              </div>
              <UserCheck className="w-12 h-12 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Mutual</p>
                <p className="text-3xl font-bold">{stats.mutual}</p>
              </div>
              <UserCheck className="w-12 h-12 opacity-50" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="flex border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab('following')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
              activeTab === 'following'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-5 h-5" />
            Following ({stats.following})
          </button>

          <button
            onClick={() => setActiveTab('followers')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
              activeTab === 'followers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserCheck className="w-5 h-5" />
            Followers ({stats.followers})
          </button>

          <button
            onClick={() => setActiveTab('suggestions')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
              activeTab === 'suggestions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            Suggestions
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
              activeTab === 'search'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Search className="w-5 h-5" />
            Search
          </button>
        </div>

        {/* Search Form */}
        {activeTab === 'search' && (
          <div className="p-4 border-b">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, bio, or skills..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <>
            {/* Following Tab */}
            {activeTab === 'following' && (
              <div className="space-y-4">
                {following.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No connections yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Start connecting with people who share your interests
                    </p>
                    <button
                      onClick={() => setActiveTab('suggestions')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <TrendingUp className="w-5 h-5" />
                      View Suggestions
                    </button>
                  </div>
                ) : (
                  following.map((connection) => (
                    <UserCard
                      key={connection.connectionId}
                      user={{ ...connection.user, isConnected: true }}
                      connectedAt={connection.connectedAt}
                    />
                  ))
                )}
              </div>
            )}

            {/* Followers Tab */}
            {activeTab === 'followers' && (
              <div className="space-y-4">
                {followers.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No followers yet
                    </h3>
                    <p className="text-gray-600">
                      Share your profile to attract followers
                    </p>
                  </div>
                ) : (
                  followers.map((connection) => (
                    <UserCard
                      key={connection.connectionId}
                      user={connection.user}
                      connectedAt={connection.connectedAt}
                    />
                  ))
                )}
              </div>
            )}

            {/* Suggestions Tab */}
            {activeTab === 'suggestions' && (
              <div className="space-y-4">
                {suggestions.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No suggestions available
                    </h3>
                    <p className="text-gray-600">
                      Add more skills to your profile to get better suggestions
                    </p>
                  </div>
                ) : (
                  suggestions.map((user) => <UserCard key={user.userId} user={user} />)
                )}
              </div>
            )}

            {/* Search Tab */}
            {activeTab === 'search' && (
              <div className="space-y-4">
                {searchResults.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {searchQuery ? 'No results found' : 'Search for users'}
                    </h3>
                    <p className="text-gray-600">
                      {searchQuery
                        ? 'Try a different search query'
                        : 'Enter a name, bio, or skills to search'}
                    </p>
                  </div>
                ) : (
                  searchResults.map((user) => <UserCard key={user.userId} user={user} />)
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
