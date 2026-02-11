import { useEffect, useState } from 'react';
import swapsService from '../services/swaps.service';
import toast from 'react-hot-toast';
import type { Swap } from '../services/swaps.service';

export default function SwapsPage() {
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'completed'>('all');

  useEffect(() => {
    loadSwaps();
  }, [filter]);

  const loadSwaps = async () => {
    try {
      const params = filter === 'all' ? {} : { status: filter.toUpperCase() as any };
      const response = await swapsService.getSwaps(params);
      if (response.success) {
        setSwaps(response.data.swaps);
      }
    } catch (error) {
      toast.error('Failed to load swaps');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (swapId: string) => {
    try {
      await swapsService.acceptSwap(swapId);
      toast.success('Swap request accepted!');
      loadSwaps();
    } catch (error) {
      toast.error('Failed to accept swap');
    }
  };

  const handleReject = async (swapId: string) => {
    try {
      await swapsService.rejectSwap(swapId);
      toast.success('Swap request rejected');
      loadSwaps();
    } catch (error) {
      toast.error('Failed to reject swap');
    }
  };

  const handleCancel = async (swapId: string) => {
    try {
      await swapsService.cancelSwap(swapId);
      toast.success('Swap cancelled');
      loadSwaps();
    } catch (error) {
      toast.error('Failed to cancel swap');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading swaps...</p>
      </div>
    );
  }

  return (
    <div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Swaps</h1>

          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('accepted')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'accepted'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'completed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        {swaps.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600 mb-4">No swaps found.</p>
            <p className="text-sm text-gray-500">
              Start by finding matches and sending swap requests!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {swaps.map((swap) => (
              <div key={swap.swapId} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Swap with {swap.initiator.name === swap.receiver.name ? swap.receiver.name : swap.initiator.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Created {new Date(swap.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(swap.status)}`}>
                    {swap.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-50 rounded p-3">
                    <p className="text-xs text-gray-600 mb-1">You teach:</p>
                    <p className="font-medium text-gray-900">{swap.initiatorSkill.name}</p>
                  </div>
                  <div className="bg-green-50 rounded p-3">
                    <p className="text-xs text-gray-600 mb-1">You learn:</p>
                    <p className="font-medium text-gray-900">{swap.receiverSkill.name}</p>
                  </div>
                </div>

                {swap.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(swap.swapId)}
                      className="btn-primary flex-1"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(swap.swapId)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {swap.status === 'ACCEPTED' && (
                  <button
                    onClick={() => handleCancel(swap.swapId)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Cancel Swap
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
   
  );
}
