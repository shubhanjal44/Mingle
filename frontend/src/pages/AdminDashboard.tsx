import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  AlertCircle,
  Shield,
  Activity,
  RefreshCw,
} from 'lucide-react';
import {
  getDashboard,
  DashboardMetrics,
  QuickActions,
  formatNumber,
  formatPercentage,
  formatCurrency,
} from '../services/admin.service';
import { toast } from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [quickActions, setQuickActions] = useState<QuickActions | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await getDashboard();
      setMetrics(data.metrics);
      setQuickActions(data.quickActions);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (!metrics || !quickActions) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load dashboard</p>
          <button
            onClick={loadDashboard}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Monitor platform performance and manage users
              </p>
            </div>
            <button
              onClick={loadDashboard}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        {(quickActions.pendingReports > 0 ||
          quickActions.suspendedUsers > 0 ||
          quickActions.failedPayments > 0) && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions Required
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.pendingReports > 0 && (
                <button
                  onClick={() => navigate('/admin/moderation')}
                  className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 hover:bg-yellow-100 transition text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-700">Pending Reports</p>
                      <p className="text-2xl font-bold text-yellow-900">
                        {quickActions.pendingReports}
                      </p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-yellow-500" />
                  </div>
                </button>
              )}

              {quickActions.suspendedUsers > 0 && (
                <button
                  onClick={() => navigate('/admin/users?status=SUSPENDED')}
                  className="bg-red-50 border border-red-200 rounded-lg p-4 hover:bg-red-100 transition text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-700">Suspended Users</p>
                      <p className="text-2xl font-bold text-red-900">
                        {quickActions.suspendedUsers}
                      </p>
                    </div>
                    <Shield className="w-8 h-8 text-red-500" />
                  </div>
                </button>
              )}

              {quickActions.failedPayments > 0 && (
                <button
                  onClick={() => navigate('/admin/payments?status=FAILED')}
                  className="bg-orange-50 border border-orange-200 rounded-lg p-4 hover:bg-orange-100 transition text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-700">Failed Payments</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {quickActions.failedPayments}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-orange-500" />
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* User Metrics */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Users"
              value={formatNumber(metrics.users.total)}
              change={metrics.users.growthRate}
              icon={Users}
              color="blue"
            />
            <MetricCard
              title="Active Users"
              value={formatNumber(metrics.users.active)}
              subtitle={`${metrics.users.verified} verified`}
              icon={Activity}
              color="green"
            />
            <MetricCard
              title="New This Month"
              value={formatNumber(metrics.users.newThisMonth)}
              subtitle={`${metrics.users.newToday} today`}
              icon={TrendingUp}
              color="purple"
            />
            <MetricCard
              title="Retention Rate"
              value={`${metrics.users.retentionRate}%`}
              change={metrics.users.retentionRate > 80 ? 5 : -5}
              icon={RefreshCw}
              color="indigo"
            />
          </div>
        </div>

        {/* Revenue Metrics */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Revenue"
              value={formatCurrency(metrics.revenue.totalRevenue)}
              icon={DollarSign}
              color="green"
            />
            <MetricCard
              title="MRR"
              value={formatCurrency(metrics.subscriptions.mrr)}
              subtitle="Monthly Recurring Revenue"
              icon={TrendingUp}
              color="blue"
            />
            <MetricCard
              title="This Month"
              value={formatCurrency(metrics.revenue.revenueThisMonth)}
              change={
                ((metrics.revenue.revenueThisMonth - metrics.revenue.revenueLastMonth) /
                  (metrics.revenue.revenueLastMonth || 1)) *
                100
              }
              icon={DollarSign}
              color="purple"
            />
            <MetricCard
              title="ARPU"
              value={formatCurrency(metrics.revenue.averageRevenuePerUser)}
              subtitle="Average Revenue Per User"
              icon={Users}
              color="indigo"
            />
          </div>
        </div>

        {/* Subscription Metrics */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Subscription Breakdown
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SubscriptionCard
              tier="FREE"
              count={metrics.subscriptions.free}
              total={metrics.subscriptions.total}
              color="gray"
            />
            <SubscriptionCard
              tier="BASIC"
              count={metrics.subscriptions.basic}
              total={metrics.subscriptions.total}
              color="blue"
            />
            <SubscriptionCard
              tier="PRO"
              count={metrics.subscriptions.pro}
              total={metrics.subscriptions.total}
              color="purple"
            />
          </div>
        </div>

        {/* Platform Activity */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Activity</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              <ActivityStat
                label="Active Swaps"
                value={metrics.platform.activeSwaps}
              />
              <ActivityStat
                label="Total Swaps"
                value={metrics.swaps.total}
              />
              <ActivityStat
                label="Messages"
                value={formatNumber(metrics.platform.messagesSent)}
              />
              <ActivityStat
                label="Events"
                value={metrics.platform.eventsCreated}
              />
              <ActivityStat
                label="Reviews"
                value={formatNumber(metrics.platform.reviewsGiven)}
              />
              <ActivityStat
                label="Avg Rating"
                value={metrics.swaps.averageRating.toFixed(1)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'purple' | 'indigo' | 'red' | 'yellow';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  color,
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {change !== undefined && (
          <div className="flex items-center mt-2">
            {change >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
            )}
            <span
              className={`text-sm font-medium ${
                change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatPercentage(change)}
            </span>
          </div>
        )}
        {subtitle && !change && (
          <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

// Subscription Card Component
interface SubscriptionCardProps {
  tier: string;
  count: number;
  total: number;
  color: 'gray' | 'blue' | 'purple';
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  tier,
  count,
  total,
  color,
}) => {
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';

  const colorClasses = {
    gray: 'from-gray-500 to-gray-600',
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div
        className={`inline-block px-3 py-1 rounded-full text-white text-sm font-medium bg-gradient-to-r ${colorClasses[color]} mb-4`}
      >
        {tier}
      </div>
      <p className="text-3xl font-bold text-gray-900">{formatNumber(count)}</p>
      <p className="text-sm text-gray-500 mt-2">{percentage}% of total users</p>
    </div>
  );
};

// Activity Stat Component
interface ActivityStatProps {
  label: string;
  value: string | number;
}

const ActivityStat: React.FC<ActivityStatProps> = ({ label, value }) => {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
};

export default AdminDashboard;
