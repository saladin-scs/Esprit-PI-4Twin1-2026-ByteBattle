import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { usersApi } from '../../services/api';
import { AppDispatch, RootState } from '../../store/store';
import { fetchMe } from '../../store/slices/authSlice';
import type { FullProfile } from '../../types/profile';
import { RANK_TIER_COLORS as RANK_COLORS, BADGE_CATALOG } from '../../types/profile';
import EditProfileModal from '../../components/Profile/EditProfileModal';
import toast from 'react-hot-toast';
import { Button, Spinner, Alert, PageContainer } from '../../shared/components';

interface ActivityData {
  heatmap: Array<{ date: string; count: number }>;
  recentActivity: Array<{ type: string; date: string; title?: string; success?: boolean }>;
}
interface SkillTreeItem {
  id: string;
  name: string;
  progress: number;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function PublicProfile() {
  const { username } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector((s: RootState) => s.auth.user);
  const isOwner = Boolean(currentUser?.username && username && currentUser.username === username);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [skillTreeData, setSkillTreeData] = useState<SkillTreeItem[] | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Image upload states
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    try {
      const res = await usersApi.publicByUsername(username || '');
      setProfile(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Profile not found');
    }
  }, [username]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        await loadProfile();
      } finally {
        setLoading(false);
      }
    })();
  }, [loadProfile]);

  // New badge notification (owner only)
  useEffect(() => {
    if (!isOwner || !currentUser) return;
    usersApi.newBadge()
      .then((res) => {
        const badge = res.data;
        if (badge?.badgeId && badge?.name) {
          toast.success(`New badge unlocked: ${badge.name}`, { duration: 5000, icon: '🏆' });
        }
      })
      .catch(() => {});
  }, [isOwner, currentUser?.id]);

  // Activity & skill tree (real data)
  useEffect(() => {
    if (!username) return;
    const load = async () => {
      try {
        if (isOwner) {
          const [act, skill] = await Promise.all([
            usersApi.myActivity().then((r) => r.data),
            usersApi.mySkillTree().then((r) => r.data),
          ]);
          setActivityData(act || null);
          setSkillTreeData(skill || null);
        } else {
          const [act, skill] = await Promise.all([
            usersApi.publicActivity(username).then((r) => r.data),
            usersApi.publicSkillTree(username).then((r) => r.data),
          ]);
          setActivityData(act || null);
          setSkillTreeData(skill || null);
        }
      } catch {
        setActivityData(null);
        setSkillTreeData(null);
      }
    };
    load();
  }, [username, isOwner]);

  // Handlers for image upload
  const handleAvatarClick = () => {
    if (isOwner) avatarInputRef.current?.click();
  };

  const handleCoverClick = () => {
    if (isOwner) coverInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await usersApi.uploadAvatar(formData);
      setProfile(prev => prev ? { ...prev, avatarUrl: response.data.avatarUrl } : null);
      
      toast.success('Avatar updated');
      dispatch(fetchMe());
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to update avatar';
      toast.error(message);
    } finally {
      setUploadingAvatar(false);
      URL.revokeObjectURL(previewUrl);
      setAvatarPreview(null);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setCoverPreview(previewUrl);

    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await usersApi.uploadCover(formData);
      setProfile(prev => prev ? { ...prev, coverImage: response.data.coverImage || response.data.coverUrl } : null);
      toast.success('Cover image updated');
      dispatch(fetchMe());
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to update cover image';
      toast.error(message);
    } finally {
      setUploadingCover(false);
      URL.revokeObjectURL(previewUrl);
      setCoverPreview(null);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <PageContainer maxWidth="2xl" className="py-12">
        <Alert variant="error">{error}</Alert>
      </PageContainer>
    );
  }

  if (!profile) return null;

  const rankProgress = profile.rankProgress || {
    currentTier: profile.rankTier || 'F',
    nextTier: 'E',
    xpInTier: 0,
    xpNeededForNext: 100,
    progressPercent: 0,
  };
  const tierColor = (RANK_COLORS as Record<string, string>)[rankProgress.currentTier] || 'from-gray-500 to-gray-700';
  const problems = profile.problemsByDifficulty || { easy: 0, medium: 0, hard: 0 };
  const unlockedBadgeIds = new Set(profile.badgeIds || []);
  const winRate =
    (profile.totalBattlesWon ?? 0) + (profile.battleLosses ?? 0) > 0
      ? Math.round(
          (100 * (profile.totalBattlesWon ?? 0)) / ((profile.totalBattlesWon ?? 0) + (profile.battleLosses ?? 0))
        )
      : 0;

  const heatmapSource = activityData?.heatmap?.length ? activityData.heatmap : profile.activityHeatmap;
  const recentActivity = activityData?.recentActivity || [];
  const skillTreeItems = skillTreeData?.length ? skillTreeData : [
    { id: 'algorithms', name: 'Algorithms', progress: 0 },
    { id: 'dataStructures', name: 'Data Structures', progress: 0 },
    { id: 'systemDesign', name: 'System Design', progress: 0 },
    { id: 'frontendBackend', name: 'Frontend/Backend', progress: 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white pb-20">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={avatarInputRef}
        onChange={handleAvatarChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={coverInputRef}
        onChange={handleCoverChange}
        accept="image/*"
        className="hidden"
      />

      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        profile={profile}
        onSaved={() => { loadProfile(); dispatch(fetchMe()); }}
      />
      
      {/* 1. Cover + Identity */}
      <section className="relative">
        {/* Cover image */}
        <div
          className={`h-48 sm:h-64 w-full relative group ${isOwner ? 'cursor-pointer' : ''}`}
          onClick={handleCoverClick}
        >
          <div
            className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-900"
            style={
              coverPreview
                ? { backgroundImage: `url(${coverPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : profile.coverImage
                ? { backgroundImage: `url(${profile.coverImage}?t=${Date.now()})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : {}
            }
          />
          {isOwner && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploadingCover ? (
                <Spinner size="sm" />
              ) : (
                <span className="text-white bg-gray-800/80 px-3 py-1 rounded-full text-sm">
                  Change cover image
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ========== PROFILE CARD (below cover, no overlap) ========== */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 -mt-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700/50 p-6 shadow-xl"
        >
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="relative -mt-16 sm:-mt-20">
              <div
                className={`w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-white dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden flex-shrink-0 relative group ${isOwner ? 'cursor-pointer' : ''}`}
                onClick={handleAvatarClick}
              >
                {(avatarPreview || profile.avatarUrl) ? (
                  <img
                    key={profile.avatarUrl}
                    src={avatarPreview || profile.avatarUrl + '?t=' + Date.now()}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-500">
                    {(profile.displayName || profile.username).charAt(0).toUpperCase()}
                  </div>
                )}
                {isOwner && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {uploadingAvatar ? (
                      <Spinner size="sm" />
                    ) : (
                      <span className="text-white text-xs">Changer</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* User details */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                      {profile.displayName || profile.username}
                    </h1>
                    {profile.emailVerifiedAt && (
                      <span className="text-blue-500 dark:text-blue-400" title="Email verified">✓</span>
                    )}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">@{profile.username}</p>
                </div>
                {isOwner && (
                  <Button type="button" onClick={() => setShowEditModal(true)} className="!py-2 text-sm">
                    Edit profile
                  </Button>
                )}
              </div>

              {profile.bio && (
                <p className="mt-2 text-gray-600 dark:text-gray-300 whitespace-pre-wrap max-w-2xl">{profile.bio}</p>
              )}

              <div className="flex flex-wrap gap-3 mt-2">
                {profile.country && (
                  <span className="text-gray-500 dark:text-gray-400 text-sm">📍 {profile.country}</span>
                )}
                {profile.memberSince && (
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    Joined {new Date(profile.memberSince).toLocaleDateString()}
                  </span>
                )}
              </div>

              {(profile.socialLinks && Object.values(profile.socialLinks).some(Boolean)) && (
                <div className="flex gap-3 mt-3">
                  {profile.socialLinks.github && (
                    <a href={profile.socialLinks.github} target="_blank" rel="noreferrer" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                      GitHub
                    </a>
                  )}
                  {profile.socialLinks.linkedin && (
                    <a href={profile.socialLinks.linkedin} target="_blank" rel="noreferrer" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                      LinkedIn
                    </a>
                  )}
                  {profile.socialLinks.twitter && (
                    <a href={profile.socialLinks.twitter} target="_blank" rel="noreferrer" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                      Twitter
                    </a>
                  )}
                  {profile.socialLinks.portfolio && (
                    <a href={profile.socialLinks.portfolio} target="_blank" rel="noreferrer" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                      Portfolio
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </section>


      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        {/* 2. Rank & Progression */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800/80 rounded-xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-sm dark:shadow-none"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Rank & Progression</h2>
          <div className="flex flex-wrap items-center gap-6">
            <div
              className={`px-4 py-2 rounded-lg bg-gradient-to-r ${tierColor} font-bold text-lg text-white`}
            >
              Rank {rankProgress.currentTier}
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
                <span>{profile.xp ?? 0} XP</span>
                {rankProgress.nextTier && (
                  <span>Next: Rank {rankProgress.nextTier}</span>
                )}
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${rankProgress.progressPercent}%` }}
                  transition={{ duration: 0.8 }}
                  className={`h-full bg-gradient-to-r ${tierColor}`}
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-3">
              <div className="text-gray-500 dark:text-gray-400 text-xs">Global position</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">#{profile.globalRank ?? '-'}</div>
            </div>
            {profile.countryRank != null && (
              <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-3">
                <div className="text-gray-500 dark:text-gray-400 text-xs">Country</div>
                <div className="text-xl font-semibold text-gray-900 dark:text-white">#{profile.countryRank}</div>
              </div>
            )}
          </div>
        </motion.section>

        {/* 3. Activity & Streak */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-gray-800/80 rounded-xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-sm dark:shadow-none"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Activity & Streak</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-500 dark:text-orange-400">{profile.currentStreak ?? 0}</div>
              <div className="text-gray-500 dark:text-gray-400 text-sm">Current streak</div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-500 dark:text-amber-400">{profile.longestStreak ?? 0}</div>
              <div className="text-gray-500 dark:text-gray-400 text-sm">Longest streak</div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{profile.totalActiveDays ?? 0}</div>
              <div className="text-gray-500 dark:text-gray-400 text-sm">Active days</div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-4 text-center">
              <div className="text-gray-500 dark:text-gray-400 text-sm">Last activity</div>
              <div className="text-sm mt-1 text-gray-900 dark:text-white">
                {profile.lastActiveAt
                  ? new Date(profile.lastActiveAt).toLocaleDateString()
                  : '-'}
              </div>
            </div>
          </div>
          {/* Heatmap */}
          <div className="mt-4">
            <div className="text-gray-500 dark:text-gray-400 text-sm mb-2">Activity (last days)</div>
            <div className="flex flex-wrap gap-0.5 max-w-full" style={{ width: 'min(100%, 52 * 12px)' }}>
              {Array.from({ length: 364 }).map((_, i) => {
                const day = heatmapSource?.[i];
                const level = day?.count ? Math.min(4, Math.ceil(day.count / 2)) : 0;
                return (
                  <div
                    key={i}
                    className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm flex-shrink-0 bg-gray-200 dark:bg-gray-700"
                    style={{
                      backgroundColor:
                        level === 0 ? undefined : (['#1e3a5f', '#2563eb', '#3b82f6', '#60a5fa'] as const)[level - 1],
                    }}
                    title={day ? `${day.date}: ${day.count}` : `Day ${i + 1}`}
                  />
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* 4. Coding Statistics */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800/80 rounded-xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-sm dark:shadow-none"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Coding statistics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-3">
              <div className="text-gray-500 dark:text-gray-400 text-xs">Solved</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">{profile.totalChallengesSolved ?? 0}</div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-3">
              <div className="text-gray-500 dark:text-gray-400 text-xs">Acceptance rate</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">{profile.acceptanceRate ?? 0}%</div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-3">
              <div className="text-gray-500 dark:text-gray-400 text-xs">Submissions</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">{profile.totalSubmissions ?? 0}</div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-3">
              <div className="text-gray-500 dark:text-gray-400 text-xs">Accepted</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">{profile.totalAccepted ?? 0}</div>
            </div>
          </div>
          <div>
            <div className="text-gray-500 dark:text-gray-400 text-sm mb-2">By difficulty</div>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-100 dark:bg-gray-900/50 rounded-lg p-3 text-center">
                <div className="text-green-600 dark:text-green-500 font-semibold">{problems.easy}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Easy</div>
              </div>
              <div className="flex-1 bg-gray-100 dark:bg-gray-900/50 rounded-lg p-3 text-center">
                <div className="text-yellow-600 dark:text-yellow-500 font-semibold">{problems.medium}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Medium</div>
              </div>
              <div className="flex-1 bg-gray-100 dark:bg-gray-900/50 rounded-lg p-3 text-center">
                <div className="text-red-600 dark:text-red-500 font-semibold">{problems.hard}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Hard</div>
              </div>
            </div>
          </div>
          {/* Acceptance rate chart */}
          <div className="mt-4">
            <div className="text-gray-500 dark:text-gray-400 text-sm mb-2">Acceptance rate</div>
            <div className="h-32 w-full max-w-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Accepted', value: profile.totalAccepted ?? 0, fill: '#10b981' },
                    { name: 'Rejected', value: (profile.totalSubmissions ?? 0) - (profile.totalAccepted ?? 0), fill: '#ef4444' },
                  ].filter((d) => d.value > 0)}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#e5e7eb' }}
                  />
                  <Bar dataKey="value" name="Submissions" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Language distribution */}
          {profile.languageStats && Object.keys(profile.languageStats).length > 0 && (
            <div className="mt-4">
              <div className="text-gray-500 dark:text-gray-400 text-sm mb-2">By language</div>
              <div className="h-48 w-full max-w-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(profile.languageStats).map(([name, value], i) => ({
                        name,
                        value,
                        fill: CHART_COLORS[i % CHART_COLORS.length],
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={64}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {Object.entries(profile.languageStats).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                      formatter={(value: number | undefined) => [value ?? 0, 'Submissions']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </motion.section>

        {/* 5. Achievement Badges */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="bg-white dark:bg-gray-800/80 rounded-xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-sm dark:shadow-none"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Badges</h2>
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
            <span>{unlockedBadgeIds.size} / {BADGE_CATALOG.length} unlocked</span>
            <span>{BADGE_CATALOG.length ? Math.round((100 * unlockedBadgeIds.size) / BADGE_CATALOG.length) : 0}%</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {BADGE_CATALOG.map((badge) => {
              const unlocked = unlockedBadgeIds.has(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`rounded-lg p-2 text-center border transition ${
                    unlocked ? 'bg-amber-500/20 border-amber-500/50' : 'bg-gray-100 dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 opacity-60'
                  }`}
                  title={`${badge.name}: ${badge.description}`}
                >
                  <div className="text-2xl">{badge.icon}</div>
                  <div className="text-xs truncate mt-1 text-gray-900 dark:text-white">{badge.name}</div>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* 5b. Skill Tree */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28 }}
          className="bg-white dark:bg-gray-800/80 rounded-xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-sm dark:shadow-none"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Skill tree</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {skillTreeItems.map((skill) => (
              <div key={skill.id} className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-3 text-center">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-300">{skill.name}</div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${skill.progress}%` }}
                    transition={{ duration: 0.6 }}
                    className="h-full bg-blue-500 rounded-full"
                  />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{skill.progress}%</div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* 6. Combat & Guild */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800/80 rounded-xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-sm dark:shadow-none"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Combat & Ranking</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-3">
              <div className="text-gray-500 dark:text-gray-400 text-xs">Wins</div>
              <div className="text-xl font-semibold text-green-600 dark:text-green-400">{profile.totalBattlesWon ?? 0}</div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-3">
              <div className="text-gray-500 dark:text-gray-400 text-xs">Losses</div>
              <div className="text-xl font-semibold text-red-600 dark:text-red-400">{profile.battleLosses ?? 0}</div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-3">
              <div className="text-gray-500 dark:text-gray-400 text-xs">Win rate</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">{winRate}%</div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-3">
              <div className="text-gray-500 dark:text-gray-400 text-xs">ELO</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">{profile.eloRating ?? 1000}</div>
            </div>
          </div>
          {profile.guildId && (
            <div className="mt-3 text-gray-500 dark:text-gray-400 text-sm">Guild: {profile.guildId}</div>
          )}
        </motion.section>

        {/* 6b. Recent Activity */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.33 }}
          className="bg-white dark:bg-gray-800/80 rounded-xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-sm dark:shadow-none"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Recent activity</h2>
          {recentActivity.length > 0 ? (
            <ul className="space-y-2">
              {recentActivity.map((item: any, i: number) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  {item.success === true ? (
                    <span className="text-green-500">✅</span>
                  ) : item.success === false ? (
                    <span className="text-red-500">❌</span>
                  ) : (
                    <span className="text-gray-500">⏳</span>
                  )}
                  <span className="text-gray-700 dark:text-gray-300">{item.title || item.type}</span>
                  <span className="text-gray-500 text-xs">
                    {item.date ? new Date(item.date).toLocaleDateString() : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No recent activity.</p>
          )}
        </motion.section>

        {/* 7. Virtual Economy */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="bg-white dark:bg-gray-800/80 rounded-xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-sm dark:shadow-none"
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Codyn Coins</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/50 rounded-lg px-4 py-2">
              <span className="text-2xl">🪙</span>
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{profile.codynCoins ?? 0}</span>
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">Virtual currency for rewards and bonuses</span>
          </div>
        </motion.section>

        {/* 8. Legacy achievements + Links */}
        {(Array.isArray(profile.achievements) && profile.achievements.length > 0) || (Array.isArray(profile.links) && profile.links.length > 0) ? (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800/80 rounded-xl p-6 border border-gray-200 dark:border-gray-700/50 shadow-sm dark:shadow-none"
          >
            {Array.isArray(profile.achievements) && profile.achievements.length > 0 && (
              <>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Achievements</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {profile.achievements.map((a: string) => (
                    <span key={a} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded text-sm">
                      {a}
                    </span>
                  ))}
                </div>
              </>
            )}
            {Array.isArray(profile.links) && profile.links.length > 0 && (
              <>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Links</h2>
                <ul className="space-y-1">
                  {profile.links.map((l: string) => (
                    <li key={l}>
                      <a className="text-blue-600 dark:text-blue-400 hover:underline" href={l} target="_blank" rel="noreferrer">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </motion.section>
        ) : null}
      </div>
    </div>
  );
}

export default PublicProfile;
