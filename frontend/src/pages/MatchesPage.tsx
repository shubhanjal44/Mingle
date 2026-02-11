import { useEffect, useState } from 'react';
import matchingService from '../services/matching.service';
import swapsService from '../services/swaps.service';
import toast from 'react-hot-toast';
import type { Match } from '../services/matching.service';

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingSwapId, setSendingSwapId] = useState<string | null>(null);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      const response = await matchingService.findMatches({ limit: 20 });
      if (response.success) {
        setMatches(response.data.matches);
      }
    } catch (error) {
      toast.error('Failed to load matches');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendSwapRequest = async (match: Match) => {
    if (match.matchedSkills.length === 0) {
      toast.error('No compatible skills found');
      return;
    }

    const firstSkill = match.matchedSkills[0];
    setSendingSwapId(match.userId);

    try {
      await swapsService.createSwap({
        receiverId: match.userId,
        initiatorSkillId: firstSkill.skillId,
        receiverSkillId: firstSkill.skillId,
      });

      toast.success('Swap request sent successfully!');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send swap request';
      toast.error(message);
    } finally {
      setSendingSwapId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading matches...</p>
      </div>
    );
  }

  return (
    <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Find Your Perfect Match</h1>

        {matches.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600 mb-4">No matches found yet.</p>
            <p className="text-sm text-gray-500">
              Add more skills to your profile to find better matches!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match) => (
              <div key={match.userId} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{match.name}</h3>
                    <p className="text-sm text-gray-500">
                      {match.city && match.state ? `${match.city}, ${match.state}` : 'Location not specified'}
                    </p>
                  </div>
                  <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                    {match.matchScore}% Match
                  </div>
                </div>

                {match.bio && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{match.bio}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span>⭐ {match.rating.toFixed(1)}</span>
                  <span>• {match.completedSwaps} swaps</span>
                </div>

                {match.matchedSkills.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Matched Skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {match.matchedSkills.slice(0, 3).map((skill) => (
                        <span
                          key={skill.skillId}
                          className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                        >
                          {skill.skillName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleSendSwapRequest(match)}
                  disabled={sendingSwapId === match.userId}
                  className="btn-primary w-full text-sm"
                >
                  {sendingSwapId === match.userId ? 'Sending...' : 'Send Swap Request'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    
  );
}
