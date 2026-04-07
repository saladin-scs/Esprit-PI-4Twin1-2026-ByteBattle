import { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';
import { CompetitionStatusBadge } from '../Competitions/components/CompetitionStatusBadge';
import { CompetitionTypeBadge } from '../Competitions/components/CompetitionTypeBadge';
import toast from 'react-hot-toast';
import { Trash2, Edit2, Plus } from 'lucide-react';
import { competitionsApi } from '../../services/api';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

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

const competitionSchema = yup.object().shape({
  name: yup.string().required('Name is required').max(100, 'Name cannot exceed 100 characters'),
  description: yup.string().required('Description is required').max(1000, 'Description is too long'),
  type: yup.mixed<'code_golf' | 'speed' | 'algorithmic'>().oneOf(['code_golf', 'speed', 'algorithmic']).required('Type is required'),
  difficulty: yup.mixed<'easy' | 'medium' | 'hard' | 'expert'>().oneOf(['easy', 'medium', 'hard', 'expert']).required('Difficulty is required'),
  challengeIds: yup.array().of(yup.string().required()).min(1, 'Select at least one challenge').required('Challenges are required'),
  startTime: yup.string().required('Start time is required').test('is-future', 'Start time must be in the future', function(value) {
    // Only check future for new comps if needed, but the original logic said: `new Date(formData.startTime) > new Date()` is required on create. We will check it later on submit if context demands it.
    if (!value) return true;
    return true;
  }),
  endTime: yup.string()
    .required('End time is required')
    .test('is-after-start', 'End time must be after start time', function(value) {
      const { startTime } = this.parent;
      if (!startTime || !value) return true; 
      return new Date(value) > new Date(startTime);
    }),
  prizesText: yup.string().optional()
});

type CompetitionFormData = yup.InferType<typeof competitionSchema>;

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

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CompetitionFormData>({
    resolver: yupResolver(competitionSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      type: 'speed',
      difficulty: 'medium',
      challengeIds: [],
      startTime: '',
      endTime: '',
      prizesText: ''
    }
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

  const openCreateModal = () => {
    reset({
      name: '',
      description: '',
      type: 'speed',
      difficulty: 'medium',
      challengeIds: [],
      startTime: '',
      endTime: '',
      prizesText: ''
    });
    setShowCreateModal(true);
  };

  const openEditModal = (comp: Competition) => {
    setSelectedCompetition(comp);
    reset({
      name: comp.name,
      description: comp.description,
      type: comp.type,
      difficulty: comp.difficulty,
      challengeIds: comp.challengeIds,
      startTime: new Date(comp.startTime).toISOString().slice(0, 16),
      endTime: new Date(comp.endTime).toISOString().slice(0, 16),
      prizesText: (comp.prizes || []).join('\n')
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (comp: Competition) => {
    setSelectedCompetition(comp);
    setShowDeleteModal(true);
  };

  const handleCreate = async (data: CompetitionFormData) => {
    try {
      const isScheduled = new Date(data.startTime) > new Date();
      if (!isScheduled) {
        toast.error('Start time must be in the future');
        return;
      }

      const prizes = (data.prizesText || '').split('\n').filter(Boolean);

      await apiClient.post('/competitions', {
        name: data.name,
        description: data.description,
        type: data.type,
        difficulty: data.difficulty,
        challengeIds: data.challengeIds,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
        prizes
      });
      
      toast.success('Competition created successfully!');
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create competition');
    }
  };

  const handleUpdate = async (data: CompetitionFormData) => {
    if (!selectedCompetition) return;
    
    try {
      const prizes = (data.prizesText || '').split('\n').filter(Boolean);

      await apiClient.put(`/competitions/${selectedCompetition._id}`, {
        name: data.name,
        description: data.description,
        type: data.type,
        difficulty: data.difficulty,
        challengeIds: data.challengeIds,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
        prizes
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

  const renderModal = (title: string, onSubmitHandler: (data: CompetitionFormData) => Promise<void>, isEdit: boolean) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{title}</h2>
        
        <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white focus:border-blue-500 outline-none"
                {...register('name')}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type *</label>
              <select
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white focus:border-blue-500 outline-none"
                {...register('type')}
                disabled={isEdit}
              >
                <option value="speed">Speed Challenge</option>
                <option value="code_golf">Code Golf</option>
                <option value="algorithmic">Algorithmic</option>
              </select>
              {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white focus:border-blue-500 outline-none"
              {...register('description')}
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Difficulty</label>
              <select
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white focus:border-blue-500 outline-none"
                {...register('difficulty')}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>
              {errors.difficulty && <p className="text-red-500 text-sm mt-1">{errors.difficulty.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Challenges *</label>
              <select
                multiple
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white focus:border-blue-500 outline-none min-h-[100px]"
                {...register('challengeIds')}
              >
                {challenges.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple</p>
              {errors.challengeIds && <p className="text-red-500 text-sm mt-1">{errors.challengeIds.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Time *</label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white focus:border-blue-500 outline-none"
                {...register('startTime')}
              />
              {errors.startTime && <p className="text-red-500 text-sm mt-1">{errors.startTime.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Time *</label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white focus:border-blue-500 outline-none"
                {...register('endTime')}
              />
              {errors.endTime && <p className="text-red-500 text-sm mt-1">{errors.endTime.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prizes (one per line)</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white focus:border-blue-500 outline-none"
              placeholder="$500 Prize Pool&#10;Premium Badge"
              {...register('prizesText')}
            />
            {errors.prizesText && <p className="text-red-500 text-sm mt-1">{errors.prizesText.message}</p>}
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
