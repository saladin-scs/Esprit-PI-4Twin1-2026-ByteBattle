import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { usersApi } from '../../services/api';
import { AppDispatch, RootState } from '../../store/store';
import { fetchMe } from '../../store/slices/authSlice';
import { Button, Input, Textarea, Card, Alert, PageContainer } from '../../shared/components';

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
    setDisplayName(user?.displayName || '');
    setAvatarUrl(user?.avatarUrl || '');
  }, [user?.displayName, user?.avatarUrl]);

  useEffect(() => {
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
      setSuccess('Profile updated.');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer maxWidth="2xl" className="py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Profile settings</h1>

      <Card title="">
        <form onSubmit={onSave} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <Input
            label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Textarea
            label="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Country (ISO2)"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              maxLength={2}
            />
            <Input
              label="Avatar URL"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
          </div>
          <Textarea
            label="Links (one per line)"
            value={links}
            onChange={(e) => setLinks(e.target.value)}
            rows={4}
          />
          <Button type="submit" loading={loading} disabled={loading}>
            Save
          </Button>
        </form>
      </Card>
    </PageContainer>
  );
}

export default ProfileSettings;
