import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { usersApi } from '../../services/api';
import { AppDispatch, RootState } from '../../store/store';
import { fetchMe } from '../../store/slices/authSlice';

function ProfileSettings() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [links, setLinks] = useState('');

  useEffect(() => {
    // Initialize from store if available
    setDisplayName(user?.displayName || '');
    setAvatarUrl(user?.avatarUrl || '');
  }, [user?.displayName, user?.avatarUrl]);

  useEffect(() => {
    // Fetch full profile once for fields not stored in auth slice
    (async () => {
      try {
        const res = await usersApi.me();
        const u = res.data;
        setDisplayName(u.displayName || '');
        setBio(u.bio || '');
        setCountry(u.country || '');
        setAvatarUrl(u.avatarUrl || '');
        setLinks(Array.isArray(u.links) ? u.links.join('\n') : '');
      } catch {
        // ignore
      }
    })();
  }, []);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const linkArr = links
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      await usersApi.updateMe({
        displayName: displayName || undefined,
        bio: bio || undefined,
        country: country || undefined,
        avatarUrl: avatarUrl || undefined,
        links: linkArr.length ? linkArr : undefined,
      });
      await dispatch(fetchMe());
      setSuccess('Profil mis à jour.');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Paramètres du profil</h1>

      <form onSubmit={onSave} className="bg-gray-800 p-6 rounded-lg space-y-4">
        {error && <div className="bg-red-600 text-white p-3 rounded">{error}</div>}
        {success && <div className="bg-green-700 text-white p-3 rounded">{success}</div>}

        <div>
          <label className="block text-sm font-medium mb-2">Nom affiché</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Pays (ISO2)</label>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              maxLength={2}
              className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Avatar URL</label>
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Liens (1 par ligne)</label>
          <textarea
            value={links}
            onChange={(e) => setLinks(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-4 py-2 rounded-md font-medium"
        >
          {loading ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </form>
    </div>
  );
}

export default ProfileSettings;

