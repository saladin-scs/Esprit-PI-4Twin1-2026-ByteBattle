import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usersApi } from '../../services/api';

function PublicProfile() {
  const { username } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await usersApi.publicByUsername(username || '');
        setProfile(res.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || err.message || 'Profil introuvable');
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        Chargement…
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-600 text-white p-3 rounded">{error}</div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="flex items-center gap-4 mb-6">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="avatar"
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-700" />
          )}
          <div>
            <div className="text-2xl font-bold">
              {profile.displayName || profile.username}
            </div>
            <div className="text-gray-400">@{profile.username}</div>
          </div>
        </div>

        {profile.bio && <p className="text-gray-200 mb-6 whitespace-pre-wrap">{profile.bio}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-900/50 p-4 rounded">
            <div className="text-gray-400 text-sm">Rating</div>
            <div className="text-xl font-semibold">{profile.rating ?? 0}</div>
          </div>
          <div className="bg-gray-900/50 p-4 rounded">
            <div className="text-gray-400 text-sm">Challenges</div>
            <div className="text-xl font-semibold">{profile.totalChallengesSolved ?? 0}</div>
          </div>
          <div className="bg-gray-900/50 p-4 rounded">
            <div className="text-gray-400 text-sm">Battles won</div>
            <div className="text-xl font-semibold">{profile.totalBattlesWon ?? 0}</div>
          </div>
        </div>

        {Array.isArray(profile.achievements) && profile.achievements.length > 0 && (
          <div className="mt-6">
            <div className="text-gray-400 text-sm mb-2">Achievements</div>
            <div className="flex flex-wrap gap-2">
              {profile.achievements.map((a: string) => (
                <span key={a} className="bg-gray-700 px-3 py-1 rounded text-sm">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(profile.links) && profile.links.length > 0 && (
          <div className="mt-6">
            <div className="text-gray-400 text-sm mb-2">Liens</div>
            <ul className="space-y-1">
              {profile.links.map((l: string) => (
                <li key={l}>
                  <a className="text-primary-400 hover:underline" href={l} target="_blank" rel="noreferrer">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicProfile;

