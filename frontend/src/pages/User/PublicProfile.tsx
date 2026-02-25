import { useEffect, useState, useCallback } from 'react';
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

  const loadProfile = useCallback(async () => {
    try {
      const res = await usersApi.publicByUsername(username || '');
      setProfile(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Profil introuvable');
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
          toast.success(`Nouveau badge débloqué : ${badge.name}`, { duration: 5000, icon: '🏆' });
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <PageContainer maxWidth="3xl" className="py-12">
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
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        profile={profile}
        onSaved={() => { loadProfile(); dispatch(fetchMe()); }}
      />
      {/* 1. Cover + Identity */}
      <section className="relative">
        <div
          className="h-40 sm:h-52 bg-gradient-to-r from-slate-800 to-slate-900"
          style={
            profile.coverImage
              ? { backgroundImage: `url(${profile.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : {}
          }
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-end gap-4"
          >
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-gray-800 bg-gray-800 overflow-hidden flex-shrink-0">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-500">
                  {(profile.displayName || profile.username).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-bold">
                      {profile.displayName || profile.username}
                    </h1>
                    {profile.emailVerifiedAt && (
                      <span className="text-blue-400" title="Email vérifié">✓</span>
                    )}
                  </div>
                  <p className="text-gray-400">@{profile.username}</p>
                </div>
                {isOwner && (
                  <Button type="button" onClick={() => setShowEditModal(true)} className="!py-2 text-sm">
                    Modifier le profil
                  </Button>
                )}
              </div>
              {profile.bio && (
                <p className="mt-2 text-gray-300 whitespace-pre-wrap max-w-2xl">{profile.bio}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-2">
                {profile.country && (
                  <span className="text-gray-400 text-sm">📍 {profile.country}</span>
                )}
                {profile.memberSince && (
                  <span className="text-gray-400 text-sm">
                    Rejoint {new Date(profile.memberSince).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
              {(profile.socialLinks && Object.values(profile.socialLinks).some(Boolean)) && (
                <div className="flex gap-3 mt-3">
                  {profile.socialLinks.github && (
                    <a href={profile.socialLinks.github} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white">
                      GitHub
                    </a>
                  )}
                  {profile.socialLinks.linkedin && (
                    <a href={profile.socialLinks.linkedin} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white">
                      LinkedIn
                    </a>
                  )}
                  {profile.socialLinks.twitter && (
                    <a href={profile.socialLinks.twitter} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white">
                      Twitter
                    </a>
                  )}
                  {profile.socialLinks.portfolio && (
                    <a href={profile.socialLinks.portfolio} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white">
                      Portfolio
                    </a>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        {/* 2. Rank & Progression */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800/80 rounded-xl p-6 border border-gray-700/50"
        >
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Rang & Progression</h2>
          <div className="flex flex-wrap items-center gap-6">
            <div
              className={`px-4 py-2 rounded-lg bg-gradient-to-r ${tierColor} font-bold text-lg`}
            >
              Rang {rankProgress.currentTier}
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>{profile.xp ?? 0} XP</span>
                {rankProgress.nextTier && (
                  <span>Prochain: Rang {rankProgress.nextTier}</span>
                )}
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
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
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-gray-400 text-xs">Position globale</div>
              <div className="text-xl font-semibold">#{profile.globalRank ?? '-'}</div>
            </div>
            {profile.countryRank != null && (
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-gray-400 text-xs">Pays</div>
                <div className="text-xl font-semibold">#{profile.countryRank}</div>
              </div>
            )}
          </div>
        </motion.section>

        {/* 3. Activity & Streak */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-gray-800/80 rounded-xl p-6 border border-gray-700/50"
        >
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Activité & Série</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">{profile.currentStreak ?? 0}</div>
              <div className="text-gray-400 text-sm">Jours consécutifs</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{profile.longestStreak ?? 0}</div>
              <div className="text-gray-400 text-sm">Record série</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{profile.totalActiveDays ?? 0}</div>
              <div className="text-gray-400 text-sm">Jours actifs</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4 text-center">
              <div className="text-gray-400 text-sm">Dernière activité</div>
              <div className="text-sm mt-1">
                {profile.lastActiveAt
                  ? new Date(profile.lastActiveAt).toLocaleDateString('fr-FR')
                  : '-'}
              </div>
            </div>
          </div>
          {/* Heatmap - données réelles ou fallback */}
          <div className="mt-4">
            <div className="text-gray-400 text-sm mb-2">Activité (derniers jours)</div>
            <div className="flex flex-wrap gap-0.5 max-w-full" style={{ width: 'min(100%, 52 * 12px)' }}>
              {Array.from({ length: 364 }).map((_, i) => {
                const day = heatmapSource?.[i];
                const level = day?.count ? Math.min(4, Math.ceil(day.count / 2)) : 0;
                return (
                  <div
                    key={i}
                    className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm flex-shrink-0 bg-gray-700"
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
          className="bg-gray-800/80 rounded-xl p-6 border border-gray-700/50"
        >
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Statistiques de code</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-gray-400 text-xs">Problèmes résolus</div>
              <div className="text-xl font-semibold">{profile.totalChallengesSolved ?? 0}</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-gray-400 text-xs">Taux d'acceptation</div>
              <div className="text-xl font-semibold">{profile.acceptanceRate ?? 0}%</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-gray-400 text-xs">Soumissions</div>
              <div className="text-xl font-semibold">{profile.totalSubmissions ?? 0}</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-gray-400 text-xs">Acceptées</div>
              <div className="text-xl font-semibold">{profile.totalAccepted ?? 0}</div>
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-sm mb-2">Par difficulté</div>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-900/50 rounded-lg p-3 text-center">
                <div className="text-green-500 font-semibold">{problems.easy}</div>
                <div className="text-xs text-gray-400">Facile</div>
              </div>
              <div className="flex-1 bg-gray-900/50 rounded-lg p-3 text-center">
                <div className="text-yellow-500 font-semibold">{problems.medium}</div>
                <div className="text-xs text-gray-400">Moyen</div>
              </div>
              <div className="flex-1 bg-gray-900/50 rounded-lg p-3 text-center">
                <div className="text-red-500 font-semibold">{problems.hard}</div>
                <div className="text-xs text-gray-400">Difficile</div>
              </div>
            </div>
          </div>
          {/* Graphique taux d'acceptation (Recharts) */}
          <div className="mt-4">
            <div className="text-gray-400 text-sm mb-2">Taux d'acceptation</div>
            <div className="h-32 w-full max-w-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Accepté', value: profile.totalAccepted ?? 0, fill: '#10b981' },
                    { name: 'Refusé', value: (profile.totalSubmissions ?? 0) - (profile.totalAccepted ?? 0), fill: '#ef4444' },
                  ].filter((d) => d.value > 0)}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#e5e7eb' }}
                  />
                  <Bar dataKey="value" name="Soumissions" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Graphique langues (Recharts) */}
          {profile.languageStats && Object.keys(profile.languageStats).length > 0 && (
            <div className="mt-4">
              <div className="text-gray-400 text-sm mb-2">Répartition par langue</div>
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
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {Object.entries(profile.languageStats).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                      formatter={(value: number) => [value, 'Soumissions']}
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
          className="bg-gray-800/80 rounded-xl p-6 border border-gray-700/50"
        >
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Badges</h2>
          <div className="flex justify-between text-sm text-gray-400 mb-3">
            <span>{unlockedBadgeIds.size} / {BADGE_CATALOG.length} débloqués</span>
            <span>{BADGE_CATALOG.length ? Math.round((100 * unlockedBadgeIds.size) / BADGE_CATALOG.length) : 0}%</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {BADGE_CATALOG.map((badge) => {
              const unlocked = unlockedBadgeIds.has(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`rounded-lg p-2 text-center border transition ${
                    unlocked ? 'bg-amber-500/20 border-amber-500/50' : 'bg-gray-900/50 border-gray-700 opacity-60'
                  }`}
                  title={`${badge.name}: ${badge.description}`}
                >
                  <div className="text-2xl">{badge.icon}</div>
                  <div className="text-xs truncate mt-1">{badge.name}</div>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* 5b. Skill Tree - données réelles */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28 }}
          className="bg-gray-800/80 rounded-xl p-6 border border-gray-700/50"
        >
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Arbre de compétences</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {skillTreeItems.map((skill) => (
              <div key={skill.id} className="bg-gray-900/50 rounded-lg p-3 text-center">
                <div className="text-sm font-medium text-gray-300">{skill.name}</div>
                <div className="h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${skill.progress}%` }}
                    transition={{ duration: 0.6 }}
                    className="h-full bg-blue-500 rounded-full"
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">{skill.progress}%</div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* 6. Combat & Guild */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800/80 rounded-xl p-6 border border-gray-700/50"
        >
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Combat & Classement</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-gray-400 text-xs">Victoires</div>
              <div className="text-xl font-semibold text-green-400">{profile.totalBattlesWon ?? 0}</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-gray-400 text-xs">Défaites</div>
              <div className="text-xl font-semibold text-red-400">{profile.battleLosses ?? 0}</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-gray-400 text-xs">Taux de victoire</div>
              <div className="text-xl font-semibold">{winRate}%</div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-gray-400 text-xs">ELO</div>
              <div className="text-xl font-semibold">{profile.eloRating ?? 1000}</div>
            </div>
          </div>
          {profile.guildId && (
            <div className="mt-3 text-gray-400 text-sm">Guild: {profile.guildId}</div>
          )}
        </motion.section>

        {/* 6b. Recent Activity - données réelles */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.33 }}
          className="bg-gray-800/80 rounded-xl p-6 border border-gray-700/50"
        >
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Activité récente</h2>
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
                  <span className="text-gray-300">{item.title || item.type}</span>
                  <span className="text-gray-500 text-xs">
                    {item.date ? new Date(item.date).toLocaleDateString('fr-FR') : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">Aucune activité récente.</p>
          )}
        </motion.section>

        {/* 7. Virtual Economy */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="bg-gray-800/80 rounded-xl p-6 border border-gray-700/50"
        >
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Codyn Coins</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/50 rounded-lg px-4 py-2">
              <span className="text-2xl">🪙</span>
              <span className="text-xl font-bold text-amber-400">{profile.codynCoins ?? 0}</span>
            </div>
            <span className="text-gray-400 text-sm">Monnaie virtuelle pour récompenses et bonus</span>
          </div>
        </motion.section>

        {/* 8. Legacy achievements (string list) + Links */}
        {(Array.isArray(profile.achievements) && profile.achievements.length > 0) || (Array.isArray(profile.links) && profile.links.length > 0) ? (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-800/80 rounded-xl p-6 border border-gray-700/50"
          >
            {Array.isArray(profile.achievements) && profile.achievements.length > 0 && (
              <>
                <h2 className="text-lg font-semibold text-gray-200 mb-2">Succès</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {profile.achievements.map((a: string) => (
                    <span key={a} className="bg-gray-700 px-3 py-1 rounded text-sm">
                      {a}
                    </span>
                  ))}
                </div>
              </>
            )}
            {Array.isArray(profile.links) && profile.links.length > 0 && (
              <>
                <h2 className="text-lg font-semibold text-gray-200 mb-2">Liens</h2>
                <ul className="space-y-1">
                  {profile.links.map((l: string) => (
                    <li key={l}>
                      <a className="text-blue-400 hover:underline" href={l} target="_blank" rel="noreferrer">
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
