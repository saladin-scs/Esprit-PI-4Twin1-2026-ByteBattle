import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { usersApi } from '../../services/api';
import { AppDispatch, RootState } from '../../store/store';
import { fetchMe } from '../../store/slices/authSlice';
import { Button, Input, Textarea, Card, Alert, PageContainer } from '../../shared/components';
import { Switch } from '@/shared/components/Switch';
import { Select } from '@/shared/components/Select';
import { motion } from 'framer-motion';

function ProfileSettings() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile fields
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');               // new phone field
  const [links, setLinks] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState({
    github: '',
    linkedin: '',
    twitter: '',
    portfolio: '',
  });
  const [profilePublic, setProfilePublic] = useState(true);

  // Preferences
  const [preferredLanguage, setPreferredLanguage] = useState('python');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [notifications, setNotifications] = useState({
    email: true,
    product: true,
  });

  // Load user data
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
      setCountry(user.country || '');
      setPhone((user as any).phone || '');               // load phone if exists
      setLinks(user.links || []);
      setSocialLinks({
        github: user.socialLinks?.github || '',
        linkedin: user.socialLinks?.linkedin || '',
        twitter: user.socialLinks?.twitter || '',
        portfolio: user.socialLinks?.portfolio || '',
      });
      setProfilePublic(user.profilePublic ?? true);
      setPreferredLanguage(user.preferences?.preferredLanguage || 'python');
      setTheme(user.preferences?.theme || 'dark');
      setNotifications({
        email: user.preferences?.notifications?.email ?? true,
        product: user.preferences?.notifications?.product ?? true,
      });
    }
  }, [user]);

  // Also fetch fresh data on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await usersApi.me();
        const u = res.data;
        setDisplayName(u.displayName || '');
        setBio(u.bio || '');
        setCountry(u.country || '');
        setPhone(u.phone || '');
        setLinks(u.links || []);
        setSocialLinks({
          github: u.socialLinks?.github || '',
          linkedin: u.socialLinks?.linkedin || '',
          twitter: u.socialLinks?.twitter || '',
          portfolio: u.socialLinks?.portfolio || '',
        });
        setProfilePublic(u.profilePublic ?? true);
        setPreferredLanguage(u.preferences?.preferredLanguage || 'python');
        setTheme(u.preferences?.theme || 'dark');
        setNotifications({
          email: u.preferences?.notifications?.email ?? true,
          product: u.preferences?.notifications?.product ?? true,
        });
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

    // Prepare payload (only changed fields)
    const payload: any = {};
    if (displayName !== user?.displayName) payload.displayName = displayName || undefined;
    if (bio !== user?.bio) payload.bio = bio || undefined;
    if (country !== user?.country) payload.country = country || undefined;
    if (phone !== (user as any).phone) payload.phone = phone || undefined;   // send phone
    if (JSON.stringify(links) !== JSON.stringify(user?.links)) payload.links = links.length ? links : undefined;
    if (JSON.stringify(socialLinks) !== JSON.stringify(user?.socialLinks)) payload.socialLinks = socialLinks;
    if (profilePublic !== user?.profilePublic) payload.profilePublic = profilePublic;

    // Preferences
    const prefsChanged =
      preferredLanguage !== user?.preferences?.preferredLanguage ||
      theme !== user?.preferences?.theme ||
      JSON.stringify(notifications) !== JSON.stringify(user?.preferences?.notifications);
    if (prefsChanged) {
      payload.preferences = {
        preferredLanguage,
        theme,
        notifications,
      };
    }

    if (Object.keys(payload).length === 0) {
      setSuccess('No changes to save.');
      setLoading(false);
      return;
    }

    try {
      await usersApi.updateMe(payload);
      await dispatch(fetchMe());
      setSuccess('Profile updated successfully.');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer maxWidth="4xl" className="py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Profile Settings
        </h1>

        <Card className="p-6">
          <form onSubmit={onSave} className="space-y-6">
            {error && <Alert variant="error">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            {/* Profile Information */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                Profile Information
              </h2>
              <div className="space-y-4">
                <Input
                  label="Display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your public display name"
                />
                <Textarea
                  label="Bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  placeholder="Tell us about yourself..."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Country (ISO code)"
                    value={country}
                    onChange={(e) => setCountry(e.target.value.toUpperCase())}
                    maxLength={2}
                    placeholder="e.g., US, FR, DE"
                  />
                  <Input
                    label="Phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 234 567 890"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Public profile
                  </label>
                  <Switch
                    checked={profilePublic}
                    onChange={setProfilePublic}
                  />
                </div>
              </div>
            </section>

            {/* Links */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                Links
              </h2>
              <div className="space-y-4">
                <Textarea
                  label="Custom links (one per line)"
                  value={links.join('\n')}
                  onChange={(e) => setLinks(e.target.value.split('\n').map(l => l.trim()).filter(Boolean))}
                  rows={4}
                  placeholder="https://github.com/username&#10;https://dev.to/username&#10;https://medium.com/@username"
                />
              </div>
            </section>

            {/* Social Links */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                Social Links
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="GitHub"
                  value={socialLinks.github}
                  onChange={(e) => setSocialLinks({ ...socialLinks, github: e.target.value })}
                  placeholder="https://github.com/username"
                />
                <Input
                  label="LinkedIn"
                  value={socialLinks.linkedin}
                  onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                />
                <Input
                  label="Twitter"
                  value={socialLinks.twitter}
                  onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                  placeholder="https://twitter.com/username"
                />
                <Input
                  label="Portfolio"
                  value={socialLinks.portfolio}
                  onChange={(e) => setSocialLinks({ ...socialLinks, portfolio: e.target.value })}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </section>

            {/* Preferences */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                Preferences
              </h2>
              <div className="space-y-4">
                <Select
                  label="Preferred Language"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  options={[
                    { value: 'python', label: 'Python' },
                    { value: 'javascript', label: 'JavaScript' },
                    { value: 'java', label: 'Java' },
                    { value: 'cpp', label: 'C++' },
                  ]}
                />
                <Select
                  label="Theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                  ]}
                />
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email notifications
                    </label>
                    <Switch
                      checked={notifications.email}
                      onChange={(val) => setNotifications({ ...notifications, email: val })}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Product updates
                    </label>
                    <Switch
                      checked={notifications.product}
                      onChange={(val) => setNotifications({ ...notifications, product: val })}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  // Reset to original user data
                  if (user) {
                    setDisplayName(user.displayName || '');
                    setBio(user.bio || '');
                    setCountry(user.country || '');
                    setPhone((user as any).phone || '');
                    setLinks(user.links || []);
                    setSocialLinks({
                      github: user.socialLinks?.github || '',
                      linkedin: user.socialLinks?.linkedin || '',
                      twitter: user.socialLinks?.twitter || '',
                      portfolio: user.socialLinks?.portfolio || '',
                    });
                    setProfilePublic(user.profilePublic ?? true);
                    setPreferredLanguage(user.preferences?.preferredLanguage || 'python');
                    setTheme(user.preferences?.theme || 'dark');
                    setNotifications({
                      email: user.preferences?.notifications?.email ?? true,
                      product: user.preferences?.notifications?.product ?? true,
                    });
                  }
                  setError('');
                  setSuccess('');
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={loading} disabled={loading}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </PageContainer>
  );
}

export default ProfileSettings;