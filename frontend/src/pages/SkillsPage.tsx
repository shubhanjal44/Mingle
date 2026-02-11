import { useEffect, useState } from 'react';
import skillsService from '../services/skills.service';
import toast from 'react-hot-toast';
import type { UserSkill, Skill } from '../services/skills.service';

export default function SkillsPage() {
  const [teachingSkills, setTeachingSkills] = useState<UserSkill[]>([]);
  const [learningSkills, setLearningSkills] = useState<UserSkill[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ totalTeaching: 0, totalLearning: 0 });

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      setIsLoading(true);
      const [mySkillsRes, allSkillsRes] = await Promise.all([
        skillsService.getUserSkills(),
        skillsService.getAllSkills({ limit: 100 }),
      ]);

      if (mySkillsRes.success) {
        // Backend returns { teaching: [], learning: [], stats: {} }
        setTeachingSkills(mySkillsRes.data.teaching || []);
        setLearningSkills(mySkillsRes.data.learning || []);
        setStats(mySkillsRes.data.stats || { totalTeaching: 0, totalLearning: 0 });
      }

      if (allSkillsRes.success) {
        setAllSkills(allSkillsRes.data.skills || []);
      }
    } catch (error: any) {
      console.error('Error loading skills:', error);
      toast.error(error?.response?.data?.message || 'Failed to load skills');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveSkill = async (userSkillId: string) => {
    if (!confirm('Are you sure you want to remove this skill?')) {
      return;
    }

    try {
      const response = await skillsService.removeUserSkill(userSkillId);
      if (response.success) {
        toast.success('Skill removed successfully');
        loadSkills(); // Reload to get fresh data
      }
    } catch (error: any) {
      console.error('Error removing skill:', error);
      toast.error(error?.response?.data?.message || 'Failed to remove skill');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading skills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Skills</h1>
        <button
          onClick={() => {/* TODO: Add skill modal */}}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Skill
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Teaching Skills */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            I Can Teach ({stats.totalTeaching})
          </h2>
          {teachingSkills.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <p className="text-gray-600">No teaching skills added yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Add skills you can teach to connect with learners
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {teachingSkills.map((userSkill) => (
                <div
                  key={userSkill.userSkillId}
                  className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {userSkill.skill.name}
                        </h3>
                        {userSkill.isVerified && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {userSkill.proficiencyLevel}
                        </span>
                        {userSkill.yearsOfExperience > 0 && (
                          <span className="text-sm text-gray-600">
                            {userSkill.yearsOfExperience} {userSkill.yearsOfExperience === 1 ? 'year' : 'years'}
                          </span>
                        )}
                      </div>
                      {userSkill.description && (
                        <p className="text-sm text-gray-600 mt-2">
                          {userSkill.description}
                        </p>
                      )}
                      {userSkill.skill.category && (
                        <p className="text-xs text-gray-500 mt-2">
                          Category: {userSkill.skill.category.name}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 ml-4">
                      <button
                        onClick={() => {/* TODO: Edit functionality */}}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemoveSkill(userSkill.userSkillId)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Learning Skills */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            I Want to Learn ({stats.totalLearning})
          </h2>
          {learningSkills.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <p className="text-gray-600">No learning goals added yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Add skills you want to learn to find teachers
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {learningSkills.map((userSkill) => (
                <div
                  key={userSkill.userSkillId}
                  className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {userSkill.skill.name}
                      </h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                        {userSkill.proficiencyLevel}
                      </span>
                      {userSkill.description && (
                        <p className="text-sm text-gray-600 mt-2">
                          {userSkill.description}
                        </p>
                      )}
                      {userSkill.skill.category && (
                        <p className="text-xs text-gray-500 mt-2">
                          Category: {userSkill.skill.category.name}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 ml-4">
                      <button
                        onClick={() => {/* TODO: Edit functionality */}}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemoveSkill(userSkill.userSkillId)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Available Skills */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Browse All Skills ({allSkills.length})
        </h2>
        <div className="bg-white rounded-lg shadow-sm p-6">
          {allSkills.length === 0 ? (
            <p className="text-center text-gray-600">No skills available</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {allSkills.slice(0, 20).map((skill) => (
                <div
                  key={skill.skillId}
                  className="border border-gray-200 rounded-lg p-3 hover:border-blue-500 hover:shadow-sm cursor-pointer transition-all"
                  onClick={() => {/* TODO: Add skill modal */}}
                >
                  <p className="font-medium text-gray-900 text-sm">
                    {skill.name}
                  </p>
                  {skill.category && (
                    <p className="text-xs text-gray-500 mt-1">
                      {skill.category.name}
                    </p>
                  )}
                  {skill.userSkillsCount !== undefined && (
                    <p className="text-xs text-blue-600 mt-1">
                      {skill.userSkillsCount} users
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          {allSkills.length > 20 && (
            <div className="text-center mt-4">
              <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                View All Skills →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
