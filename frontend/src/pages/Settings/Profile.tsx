import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { usersApi } from '../../services/api';
import { AppDispatch, RootState } from '../../store/store';
import { fetchMe } from '../../store/slices/authSlice';
import { Button, Input, Textarea, Card, Alert, PageContainer, Avatar } from '../../shared/components';
import { Camera } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [coverUrl, setCoverUrl] = useState('');
  const [links, setLinks] = useState('');

  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);

  useEffect(() => {
    setDisplayName(user?.displayName || '');
    setAvatarUrl(user?.avatarUrl || '');
    // Assuming backend may return coverUrl, otherwise it remains empty
    setCoverUrl((user as any)?.coverUrl || '');
  }, [user?.displayName, user?.avatarUrl, (user as any)?.coverUrl]);

  useEffect(() => {
    (async () => {
      try {
        const res = await usersApi.me();
        const u = res.data;
        setDisplayName(u.displayName || '');
        setBio(u.bio || '');
        setCountry(u.country || '');
        setAvatarUrl(u.avatarUrl || '');
        setCoverUrl(u.coverUrl || '');
        setLinks(Array.isArray(u.links) ? u.links.join('\n') : '');
      } catch {
        // ignore
      }
    })();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setAvatarUploadProgress(1);
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await usersApi.uploadAvatar(formData, {
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setAvatarUploadProgress(percentCompleted);
          }
        }
      });
      setAvatarUrl(res.data?.avatarUrl || res.data?.url || res.data || avatarUrl);
      toast.success('Avatar uploaded successfully');
      dispatch(fetchMe());
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to upload avatar');
    } finally {
      setAvatarUploadProgress(0);
      e.target.value = ''; // reset input
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCoverUploadProgress(1);
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await usersApi.uploadCover(formData, {
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setCoverUploadProgress(percentCompleted);
          }
        }
      });
      setCoverUrl(res.data?.coverUrl || res.data?.url || res.data || coverUrl);
      toast.success('Cover uploaded successfully');
      dispatch(fetchMe());
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to upload cover');
    } finally {
      setCoverUploadProgress(0);
      e.target.value = ''; // reset input
    }
  };

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
        coverUrl: coverUrl || undefined,
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
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            {/* Avatar Upload */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Avatar Image</label>
              <div className="flex items-center space-x-4 relative">
                <Avatar src={avatarUrl} fallback={displayName || user?.username || '?'} size="lg" className="w-20 h-20" />
                <div className="flex-1">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
                    <Camera className="w-4 h-4" />
                    <span>Upload Avatar</span>
                    <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleAvatarUpload} disabled={avatarUploadProgress > 0} />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP max 5MB</p>
                  {avatarUploadProgress > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 dark:bg-gray-700 overflow-hidden">
                      <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${avatarUploadProgress}%` }}></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cover Upload */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cover Image</label>
              <div className="flex-1 relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-center">
                {coverUrl ? (
                  <div className="relative w-full h-20 rounded overflow-hidden mb-2">
                    <img src={coverUrl} alt="Cover" loading="lazy" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-20 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center mb-2">
                    <span className="text-gray-400">No cover image</span>
                  </div>
                )}
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors mx-auto relative z-10">
                  <Camera className="w-4 h-4" />
                  <span>Change Cover</span>
                  <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleCoverUpload} disabled={coverUploadProgress > 0} />
                </label>
                {coverUploadProgress > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3 dark:bg-gray-700 overflow-hidden">
                    <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${coverUploadProgress}%` }}></div>
                  </div>
                )}
              </div>
            </div>
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
