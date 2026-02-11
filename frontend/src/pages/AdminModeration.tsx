import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Ban,
  Clock,
  Filter,
  RefreshCw,
} from 'lucide-react';
import {
  getReports,
  getReport,
  updateReportStatus,
  executeModeratorAction,
  getModerationStats,
  Report,
} from '../services/admin.service';
import { toast } from 'react-hot-toast';

const AdminModeration: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Modals
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter, page]);

  const loadData = async () => {
    try {
      setLoading(true);
      const offset = (page - 1) * limit;

      const [reportsData, statsData] = await Promise.all([
        getReports({
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          limit,
          offset,
        }),
        getModerationStats(),
      ]);

      setReports(reportsData.reports);
      setTotal(reportsData.total);
      setStats(statsData);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = async (reportId: string) => {
    try {
      const details = await getReport(reportId);
      setSelectedReport(details);
      setShowDetailModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load report details');
    }
  };

  const handleUpdateStatus = async (reportId: string, status: string, resolution?: string) => {
    try {
      await updateReportStatus(reportId, status, resolution);
      toast.success('Report status updated');
      loadData();
      setShowDetailModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update report');
    }
  };

  const handleTakeAction = (report: any) => {
    setSelectedReport(report);
    setShowActionModal(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      UNDER_REVIEW: 'bg-blue-100 text-blue-700',
      RESOLVED: 'bg-green-100 text-green-700',
      DISMISSED: 'bg-gray-100 text-gray-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SPAM':
      case 'HARASSMENT':
      case 'INAPPROPRIATE_CONTENT':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Shield className="w-5 h-5 text-blue-500" />;
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Content Moderation</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Review and resolve user reports
                </p>
              </div>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              label="Total Reports"
              value={stats.totalReports}
              icon={Shield}
              color="blue"
            />
            <StatCard
              label="Pending"
              value={stats.pendingReports}
              icon={Clock}
              color="yellow"
            />
            <StatCard
              label="Resolved"
              value={stats.resolvedReports}
              icon={CheckCircle}
              color="green"
            />
            <StatCard
              label="Total Actions"
              value={stats.totalActions}
              icon={Ban}
              color="red"
            />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="USER">User</option>
                <option value="REVIEW">Review</option>
                <option value="MESSAGE">Message</option>
                <option value="EVENT">Event</option>
                <option value="SPAM">Spam</option>
                <option value="HARASSMENT">Harassment</option>
                <option value="INAPPROPRIATE_CONTENT">Inappropriate Content</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No reports found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Report
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Reporter
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Reported User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reports.map((report) => (
                      <tr key={report.reportId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {getTypeIcon(report.type)}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {report.type.replace('_', ' ')}
                              </div>
                              <div className="text-sm text-gray-500 line-clamp-1">
                                {report.reason}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{report.reporter.name}</div>
                          <div className="text-sm text-gray-500">{report.reporter.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          {report.reportedUser ? (
                            <>
                              <div className="text-sm text-gray-900">
                                {report.reportedUser.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {report.reportedUser.email}
                              </div>
                            </>
                          ) : (
                            <span className="text-sm text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              report.status
                            )}`}
                          >
                            {report.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleViewReport(report.reportId)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Details"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            {report.status === 'PENDING' && (
                              <button
                                onClick={() => handleTakeAction(report)}
                                className="text-red-600 hover:text-red-900"
                                title="Take Action"
                              >
                                <Ban className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of{' '}
                  {total} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Report Detail Modal */}
      {showDetailModal && selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setShowDetailModal(false)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* Action Modal */}
      {showActionModal && selectedReport && (
        <ActionModal
          report={selectedReport}
          onClose={() => setShowActionModal(false)}
          onSuccess={() => {
            setShowActionModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'yellow' | 'green' | 'red';
}> = ({ label, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

// Report Detail Modal
const ReportDetailModal: React.FC<{
  report: any;
  onClose: () => void;
  onUpdateStatus: (reportId: string, status: string, resolution?: string) => void;
}> = ({ report, onClose, onUpdateStatus }) => {
  const [resolution, setResolution] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Report Details</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Type</div>
                <div className="text-sm font-medium text-gray-900">{report.type}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Status</div>
                <div className="text-sm font-medium text-gray-900">{report.status}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-gray-500">Reason</div>
                <div className="text-sm font-medium text-gray-900">{report.reason}</div>
              </div>
              {report.description && (
                <div className="col-span-2">
                  <div className="text-sm text-gray-500">Description</div>
                  <div className="text-sm text-gray-900">{report.description}</div>
                </div>
              )}
            </div>
          </div>

          {report.reportedUser && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reported User</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Name</div>
                  <div className="text-sm font-medium text-gray-900">
                    {report.reportedUser.name}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Email</div>
                  <div className="text-sm font-medium text-gray-900">
                    {report.reportedUser.email}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <div className="text-sm font-medium text-gray-900">
                    {report.reportedUser.status}
                  </div>
                </div>
              </div>
            </div>
          )}

          {report.status === 'PENDING' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Notes
              </label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter resolution notes..."
              />
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          {report.status === 'PENDING' && (
            <>
              <button
                onClick={() => onUpdateStatus(report.reportId, 'DISMISSED', resolution)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Dismiss
              </button>
              <button
                onClick={() => onUpdateStatus(report.reportId, 'UNDER_REVIEW')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Mark Under Review
              </button>
              <button
                onClick={() => onUpdateStatus(report.reportId, 'RESOLVED', resolution)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Resolve
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Action Modal
const ActionModal: React.FC<{
  report: any;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ report, onClose, onSuccess }) => {
  const [actionType, setActionType] = useState('WARN_USER');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(7);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    try {
      setLoading(true);
      await executeModeratorAction({
        actionType,
        targetUserId: report.reportedUser?.userId,
        reason,
        duration: actionType === 'SUSPEND_USER' ? duration : undefined,
        reportId: report.reportId,
      });
      toast.success('Action executed successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to execute action');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Take Action</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action Type
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="WARN_USER">Warn User</option>
              <option value="SUSPEND_USER">Suspend User</option>
              <option value="BAN_USER">Ban User</option>
              <option value="DELETE_CONTENT">Delete Content</option>
              <option value="DISMISS_REPORT">Dismiss Report</option>
            </select>
          </div>

          {actionType === 'SUSPEND_USER' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (days)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                min={1}
                max={365}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Explain the reason for this action..."
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> This action will be logged and the user will be notified.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Executing...' : 'Execute Action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminModeration;
