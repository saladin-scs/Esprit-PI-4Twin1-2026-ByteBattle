import { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';
import { CompetitionStatusBadge } from '../Competitions/components/CompetitionStatusBadge';
import { CompetitionTypeBadge } from '../Competitions/components/CompetitionTypeBadge';
import toast from 'react-hot-toast';
import { Trash2, Edit2, Plus } from 'lucide-react';
import { competitionsApi } from '../../services/api';

interface Competition {
  _id: string;
  name: string;
  description: string;
  type: 'code_golf' | 'speed' | 'algorithmic';
  status: 'scheduled' | 'active' | 'closed' | 'archived';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  startTime: string;
  endTime: string;
  challengeIds: string[];
  supportedLanguages: string[];
  prizes?: string[];
  participants?: string[];
}

interface FormData {
  name: string;
  description: string;
  type: 'code_golf' | 'speed' | 'algorithmic';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  challengeIds: string[];
  startTime: string;
  endTime: string;
  supportedLanguages: string[];
  prizes: string[];
  rules?: string;
}

export default function AdminCompetitions() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    type: 'speed',
    difficulty: 'medium',
    challengeIds: [],
    startTime: '',
    endTime: '',
    supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
    prizes: [],
    rules: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const resComps = await apiClient.get('/competitions?limit=100');
      setCompetitions(resComps.data.competitions || []);
      
      const resChallenges = await apiClient.get('/challenges?limit=100');
      setChallenges(resChallenges.data.challenges || []);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'speed',
      difficulty: 'medium',
      challengeIds: [],
      startTime: '',
      endTime: '',
      supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
      prizes: [],
      rules: '',
    });
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (comp: Competition) => {
    setSelectedCompetition(comp);
    setFormData({
      name: comp.name,
      description: comp.description,
      type: comp.type,
      difficulty: comp.difficulty,
      challengeIds: comp.challengeIds,
      startTime: new Date(comp.startTime).toISOString().slice(0, 16),
      endTime: new Date(comp.endTime).toISOString().slice(0, 16),
      supportedLanguages: comp.supportedLanguages,
      prizes: comp.prizes || [],
      rules: '',
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (comp: Competition) => {
    setSelectedCompetition(comp);
    setShowDeleteModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isScheduled = new Date(formData.startTime) > new Date();
      if (!isScheduled) {
        toast.error('Start time must be in the future');
        return;
      }
      if (formData.challengeIds.length === 0) {
        toast.error('Please select at least one challenge');
        return;
      }

      await apiClient.post('/competitions', {
        ...formData,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
      });
      
      toast.success('Competition created successfully!');
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create competition');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompetition) return;
    
    try {
      if (formData.challengeIds.length === 0) {
        toast.error('Please select at least one challenge');
        return;
      }

      await apiClient.put(`/competitions/${selectedCompetition._id}`, {
        ...formData,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
      });
      
      toast.success('Competition updated successfully!');
      setShowEditModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update competition');
    }
  };

  const handleDelete = async () => {
    if (!selectedCompetition) return;
    
    try {
      await apiClient.delete(`/competitions/${selectedCompetition._id}`);
      toast.success('Competition deleted successfully!');
      setShowDeleteModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete competition');
    }
  };

  const handleBackfillChallenges = async () => {
    setBackfilling(true);
    try {
      const res = await competitionsApi.backfillChallenges();
      const updatedCount = res.data.updated?.length ?? 0;
      const skippedCount = res.data.skipped?.length ?? 0;
      if (updatedCount > 0) {
        toast.success(`Challenges assigned for ${updatedCount} competition(s).`);
      } else {
        toast.success('All competitions already have challenges.');
      }
      if (skippedCount > 0) {
        toast(`${skippedCount} competition(s) unchanged.`, { icon: 'ℹ️' });
      }
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to backfill competition challenges');
    } finally {
      setBackfilling(false);
    }
  };

  const renderModal = (title: string, onSubmit: (e: React.FormEvent) => Promise<void>, isEdit: boolean) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{title}</h2>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white focus:border-blue-500 outline-none"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type *</label>
              <select
                required
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white focus:border-blue-500 outline-none"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                disabled={isEdit}
              >
                <option value="speed">Speed Challenge</option>
                <option value="code_golf">Code Golf</option>
                <option value="algorithmic">Algorithmic</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label>
            <textarea
              required
              rows={3}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white focus:border-blue-500 outline-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Difficulty</label>
              <select
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white focus:border-blue-500 outline-none"
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Challenges *</label>
              <select
                multiple
                required
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white focus:border-blue-500 outline-none"
                value={formData.challengeIds}
                onChange={(e) => setFormData({
                  ...formData,
                  challengeIds: Array.from(e.target.selectedOptions, (opt) => opt.value)
                })}
              >
                {challenges.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Time *</label>
              <input
                type="datetime-local"
                required
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white focus:border-blue-500 outline-none"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Time *</label>
              <input
                type="datetime-local"
                required
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white focus:border-blue-500 outline-none"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prizes (one per line)</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white focus:border-blue-500 outline-none"
              placeholder="$500 Prize Pool&#10;Premium Badge"
              value={formData.prizes.join('\n')}
              onChange={(e) => setFormData({ ...formData, prizes: e.target.value.split('\n').filter(Boolean) })}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition"
              onClick={() => {
                if (isEdit) setShowEditModal(false);
                else setShowCreateModal(false);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
            >
              {isEdit ? 'Update Competition' : 'Create Competition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Competitions Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Create, edit, and manage programming competitions</p>
        </div>

        {/* Create Button */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            <Plus size={20} />
            Create New Competition
          </button>
          <button
            onClick={handleBackfillChallenges}
            disabled={backfilling}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
          >
            {backfilling ? 'Assigning...' : 'Assign Challenges To Competitions'}
          </button>
        </div>

        {/* Competitions Table */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Difficulty</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Start Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Participants</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Loading competitions...
                    </td>
                  </tr>
                ) : competitions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No competitions found. Create one to get started!
                    </td>
                  </tr>
                ) : (
                  competitions.map((comp) => (
                    <tr key={comp._id} className="hover:bg-gray-100 dark:hover:bg-gray-900/50 transition">
                      <td className="px-6 py-3 text-sm text-gray-900 dark:text-white font-medium">{comp.name}</td>
                      <td className="px-6 py-3 text-sm">
                        <CompetitionTypeBadge type={comp.type} />
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <CompetitionStatusBadge status={comp.status} />
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300 capitalize">{comp.difficulty}</td>
                      <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(comp.startTime).toLocaleDateString()} {new Date(comp.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">{comp.participants?.length || 0}</td>
                      <td className="px-6 py-3 text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(comp)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => openDeleteModal(comp)}
                            disabled={comp.status === 'active' || comp.status === 'closed'}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title={comp.status === 'active' || comp.status === 'closed' ? 'Cannot delete active or closed competitions' : 'Delete'}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && renderModal('Create New Competition', handleCreate, false)}
      {showEditModal && renderModal('Edit Competition', handleUpdate, true)}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedCompetition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Confirm Delete</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete <span className="font-semibold">{selectedCompetition.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
