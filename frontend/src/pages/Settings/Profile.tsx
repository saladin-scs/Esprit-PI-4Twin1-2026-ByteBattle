import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authApi, usersApi } from '../../services/api';
import { AppDispatch, RootState } from '../../store/store';
import { fetchMe, logout } from '../../store/slices/authSlice';
import {
  Button,
  Input,
  Textarea,
  Card,
  Alert,
  PageContainer,
  Avatar,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  SimpleTooltip,
  ProgressBar,
  Modal,
} from '../../shared/components';
import { Camera, User, UserCircle, Heart, Share2, ImageIcon, HelpCircle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { cn } from '../../lib/utils';

const BIO_MAX = 500;

function ProfileSettings() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, refreshToken } = useSelector((s: RootState) => s.auth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [newsletter, setNewsletter] = useState(false);
  const [referralSource, setReferralSource] = useState('');
  const [preferencesRest, setPreferencesRest] = useState<Record<string, unknown>>({});
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [links, setLinks] = useState('');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [twitter, setTwitter] = useState('');
  const [portfolio, setPortfolio] = useState('');

  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dangerPassword, setDangerPassword] = useState('');

  useEffect(() => {
    setDisplayName(user?.displayName || '');
    setAvatarUrl(user?.avatarUrl || '');
    setCoverImage((user as any)?.coverImage || (user as any)?.coverUrl || '');
    setEmail((user as any)?.email || '');
    setUsername((user as any)?.username || '');
  }, [user?.displayName, user?.avatarUrl, (user as any)?.coverImage, (user as any)?.coverUrl, (user as any)?.email, (user as any)?.username]);

  useEffect(() => {
    (async () => {
      try {
        const res = await usersApi.me();
        const u = res.data as any;
        setEmail(u.email || '');
        setUsername(u.username || '');
        setDisplayName(u.displayName || '');
        setFirstName(u.firstName || '');
        setLastName(u.lastName || '');
        setPhone(u.phone || '');
        setDateOfBirth(u.dateOfBirth ? new Date(u.dateOfBirth) : null);
        setBio(u.bio || '');
        setCountry(u.country || '');
        const prefs = u.preferences || {};
        setNewsletter(!!prefs.newsletter);
        setReferralSource(prefs.referralSource || '');
        const { newsletter: _n, referralSource: _r, ...rest } = prefs;
        setPreferencesRest(rest as Record<string, unknown>);
        setAvatarUrl(u.avatarUrl || '');
        setCoverImage(u.coverImage || u.coverUrl || '');
        setLinks(Array.isArray(u.links) ? u.links.join('\n') : '');
        setGithub(u.socialLinks?.github || '');
        setLinkedin(u.socialLinks?.linkedin || '');
        setTwitter(u.socialLinks?.twitter || '');
        setPortfolio(u.socialLinks?.portfolio || '');
      } catch {
        // ignore
      }
    })();
  }, [user?.id]);

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
        },
      });
      setAvatarUrl(res.data?.avatarUrl || res.data?.url || res.data || avatarUrl);
      toast.success('Avatar uploaded successfully');
      dispatch(fetchMe());
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to upload avatar');
    } finally {
      setAvatarUploadProgress(0);
      e.target.value = '';
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
        },
      });
      setCoverImage(res.data?.coverImage || res.data?.coverUrl || res.data?.url || res.data || coverImage);
      toast.success('Cover uploaded successfully');
      dispatch(fetchMe());
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to upload cover');
    } finally {
      setCoverUploadProgress(0);
      e.target.value = '';
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
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
        dateOfBirth: dateOfBirth ? dateOfBirth.toISOString().slice(0, 10) : undefined,
        bio: bio || undefined,
        country: country || undefined,
        avatarUrl: avatarUrl || undefined,
        coverImage: coverImage || undefined,
        links: linkArr.length ? linkArr : undefined,
        preferences: {
          ...preferencesRest,
          newsletter: newsletter,
          referralSource: referralSource || undefined,
        },
        socialLinks: {
          github: github || undefined,
          linkedin: linkedin || undefined,
          twitter: twitter || undefined,
          portfolio: portfolio || undefined,
        },
      });
      await dispatch(fetchMe());
      setSuccess('Profile updated.');
      toast.success('Profile saved');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await usersApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setSuccess('Password changed.');
      toast.success('Password updated');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const onDeactivateAccount = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await usersApi.deactivateMe(dangerPassword ? { currentPassword: dangerPassword } : undefined);
      try {
        await authApi.logout(refreshToken || undefined);
      } catch {
        // ignore
      }
      dispatch(logout());
      toast.success('Account deactivated.');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to deactivate account');
    } finally {
      setLoading(false);
      setDangerPassword('');
      setShowDeactivateModal(false);
    }
  };

  const onDeleteAccount = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await usersApi.deleteMe(dangerPassword ? { currentPassword: dangerPassword } : undefined);
      try {
        await authApi.logout(refreshToken || undefined);
      } catch {
        // ignore
      }
      dispatch(logout());
      toast.success('Account deleted.');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to delete account');
    } finally {
      setLoading(false);
      setDangerPassword('');
      setShowDeleteModal(false);
    }
  };

  const tabTriggerClass =
    'w-full justify-start gap-2 rounded-lg px-3 py-2.5 text-left data-[state=active]:shadow-sm sm:w-auto sm:min-w-[140px]';

  const fieldShell = 'rounded-xl border border-slate-200/80 bg-slate-50/50 p-5 dark:border-slate-700 dark:bg-slate-800/30';

  const bioLen = bio.length;
  const bioPct = Math.min(100, (bioLen / BIO_MAX) * 100);

  return (
    <PageContainer maxWidth="4xl" className="relative pb-28 py-10 md:py-14">
      <div className="bb-hero-gradient-tall" aria-hidden />

      <header className="relative mb-8">
        <div className="bb-kicker">
          <User className="h-3.5 w-3.5" aria-hidden />
          Account
        </div>
        <h1 className="bb-page-heading mb-2">
          <span className="bb-title-gradient text-3xl md:text-4xl">Profile settings</span>
        </h1>
        <p className="bb-body-text max-w-xl">
          Manage your account, identity, and how others see you — same layout language as contests.
        </p>
      </header>

      <form id="profile-settings-form" onSubmit={onSave}>
        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" className="mb-6">
            {success}
          </Alert>
        )}

        <Tabs defaultValue="account" className="w-full">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            <TabsList
              className={cn(
                'bb-tablist flex h-auto w-full flex-row flex-wrap gap-1 overflow-x-auto p-2 lg:w-52 lg:flex-col lg:flex-nowrap',
              )}
            >
              <TabsTrigger value="account" className={tabTriggerClass}>
                <User className="h-4 w-4 shrink-0 opacity-70" />
                Account
              </TabsTrigger>
              <TabsTrigger value="personal" className={tabTriggerClass}>
                <UserCircle className="h-4 w-4 shrink-0 opacity-70" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="profile" className={tabTriggerClass}>
                <Heart className="h-4 w-4 shrink-0 opacity-70" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="social" className={tabTriggerClass}>
                <Share2 className="h-4 w-4 shrink-0 opacity-70" />
                Social
              </TabsTrigger>
              <TabsTrigger value="security" className={tabTriggerClass}>
                <Shield className="h-4 w-4 shrink-0 opacity-70" />
                Security
              </TabsTrigger>
              <TabsTrigger value="media" className={tabTriggerClass}>
                <ImageIcon className="h-4 w-4 shrink-0 opacity-70" />
                Media
              </TabsTrigger>
            </TabsList>

            <div className="min-w-0 flex-1 space-y-6">
              <TabsContent value="account" className="mt-0 focus-visible:outline-none">
                <Card className="bb-card shadow-lg" title="">
                  <div className={fieldShell}>
                    <div className="mb-4 flex items-center gap-2">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Account
                      </h2>
                      <SimpleTooltip content="Email and username are fixed for security. Contact support if you need a change.">
                        <button
                          type="button"
                          className="rounded-full p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          aria-label="About account fields"
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </SimpleTooltip>
                    </div>
                    <div className="space-y-4">
                      <Input label="Email" value={email} disabled title="Email cannot be changed here" />
                      <Input label="Username" value={username} disabled title="Username cannot be changed here" />
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="personal" className="mt-0 focus-visible:outline-none">
                <Card className="bb-card shadow-lg" title="">
                  <div className={fieldShell}>
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Personal
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                      />
                      <Input
                        label="Last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                      />
                    </div>
                    <div className="mt-4">
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Phone
                      </label>
                      <PhoneInput
                        country="us"
                        value={phone}
                        onChange={(v) => setPhone(v)}
                        inputClass="!w-full !bg-white dark:!bg-slate-800 !text-slate-900 dark:!text-white !border-slate-300 dark:!border-slate-600 !rounded-xl !px-4 !py-2.5"
                        containerClass="w-full"
                        buttonClass="!bg-slate-100 dark:!bg-slate-700 !border-slate-300 dark:!border-slate-600 !rounded-l-xl"
                      />
                    </div>
                    <div className="mt-4">
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Date of birth
                      </label>
                      <DatePicker
                        selected={dateOfBirth}
                        onChange={(d: Date | null) => setDateOfBirth(d)}
                        maxDate={new Date()}
                        showYearDropdown
                        scrollableYearDropdown
                        placeholderText="Select date"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="profile" className="mt-0 focus-visible:outline-none">
                <Card className="bb-card shadow-lg" title="">
                  <div className="space-y-6">
                    <div className={fieldShell}>
                      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Public profile
                      </h2>
                      <Input
                        label="Display name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                      />
                      <div className="mt-4">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Bio</label>
                          <span
                            className={cn(
                              'text-xs tabular-nums',
                              bioLen > BIO_MAX * 0.9 ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-slate-500',
                            )}
                          >
                            {bioLen} / {BIO_MAX}
                          </span>
                        </div>
                        <Textarea
                          id="profile-bio"
                          label=""
                          value={bio}
                          onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                          rows={4}
                          placeholder="Short intro shown on your public profile…"
                          className="min-h-[100px]"
                        />
                        <div className="mt-2">
                          <ProgressBar
                            value={bioPct}
                            className={cn(bioLen > BIO_MAX * 0.9 && 'opacity-90')}
                            aria-label="Bio length"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="mb-1 flex items-center gap-1.5">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Country (ISO2)
                          </label>
                          <SimpleTooltip content="Two-letter code, e.g. US, FR, MA. Shown on leaderboard and profile.">
                            <span className="inline-flex cursor-help">
                              <HelpCircle className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                            </span>
                          </SimpleTooltip>
                        </div>
                        <Input
                          id="profile-country"
                          label=""
                          value={country}
                          onChange={(e) => setCountry(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))}
                          maxLength={2}
                          placeholder="US"
                        />
                      </div>
                    </div>
                    <div className={fieldShell}>
                      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Preferences
                      </h2>
                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800/50">
                        <input
                          id="profile-newsletter"
                          type="checkbox"
                          checked={newsletter}
                          onChange={(e) => setNewsletter(e.target.checked)}
                          className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        <label
                          htmlFor="profile-newsletter"
                          className="flex-1 cursor-pointer text-sm text-slate-700 dark:text-slate-300"
                        >
                          Subscribe to newsletter
                        </label>
                        <SimpleTooltip content="Occasional product updates and contest news. You can turn this off anytime.">
                          <button
                            type="button"
                            className="shrink-0 rounded-full p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            aria-label="About newsletter"
                          >
                            <HelpCircle className="h-4 w-4" />
                          </button>
                        </SimpleTooltip>
                      </div>
                      <div className="mt-4">
                        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                          How did you hear about us?
                        </label>
                        <select
                          value={referralSource}
                          onChange={(e) => setReferralSource(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        >
                          <option value="">Select an option</option>
                          <option value="social">Social Media</option>
                          <option value="friend">Friend Referral</option>
                          <option value="google">Google Search</option>
                          <option value="ad">Advertisement</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="social" className="mt-0 focus-visible:outline-none">
                <Card className="bb-card shadow-lg" title="">
                  <div className={fieldShell}>
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Social links
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label="GitHub URL"
                        type="url"
                        value={github}
                        onChange={(e) => setGithub(e.target.value)}
                        placeholder="https://github.com/..."
                      />
                      <Input
                        label="LinkedIn URL"
                        type="url"
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                        placeholder="https://linkedin.com/..."
                      />
                      <Input
                        label="Twitter / X URL"
                        type="url"
                        value={twitter}
                        onChange={(e) => setTwitter(e.target.value)}
                        placeholder="https://twitter.com/..."
                      />
                      <Input
                        label="Portfolio URL"
                        type="url"
                        value={portfolio}
                        onChange={(e) => setPortfolio(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="mt-6">
                      <Textarea
                        label="Links (one per line)"
                        value={links}
                        onChange={(e) => setLinks(e.target.value)}
                        rows={4}
                      />
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="mt-0 focus-visible:outline-none">
                <Card className="bb-card shadow-lg" title="">
                  <div className="space-y-6">
                    <div className={fieldShell}>
                      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Change password
                      </h2>
                      <form onSubmit={onChangePassword} className="space-y-4">
                        <Input
                          label="Current password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                        />
                        <Input
                          label="New password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={8}
                        />
                        <Button type="submit" disabled={loading} loading={loading}>
                          Update password
                        </Button>
                      </form>
                    </div>

                    <div className="rounded-xl border border-red-200/80 bg-red-50/70 p-4 dark:border-red-900/40 dark:bg-red-950/20">
                      <h3 className="mb-1 text-sm font-semibold text-red-900 dark:text-red-200">Danger zone</h3>
                      <p className="mb-3 text-xs text-red-800/90 dark:text-red-300/90">
                        Deactivate keeps your data but blocks login. Delete permanently removes your account and related data.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={loading}
                          onClick={() => {
                            setDangerPassword('');
                            setShowDeactivateModal(true);
                          }}
                        >
                          Deactivate account
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          disabled={loading}
                          onClick={() => {
                            setDangerPassword('');
                            setShowDeleteModal(true);
                          }}
                        >
                          Delete account
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="media" className="mt-0 focus-visible:outline-none">
                <Card className="bb-card shadow-lg" title="">
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    <div className={cn(fieldShell, '!p-0 overflow-hidden')}>
                      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Avatar</h2>
                      </div>
                      <div className="p-5">
                        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                          <Avatar
                            src={avatarUrl}
                            fallback={displayName || user?.username || '?'}
                            size="lg"
                            className="h-24 w-24 ring-4 ring-primary-500/20"
                          />
                          <div className="flex-1 text-center sm:text-left">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                              <Camera className="h-4 w-4" />
                              Upload avatar
                              <input
                                type="file"
                                className="hidden"
                                accept="image/png, image/jpeg, image/webp"
                                onChange={handleAvatarUpload}
                                disabled={avatarUploadProgress > 0}
                              />
                            </label>
                            <p className="mt-2 text-xs text-slate-500">PNG, JPG, WEBP · max 5MB</p>
                            {avatarUploadProgress > 0 && (
                              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                <div
                                  className="h-full rounded-full bg-primary-600 transition-all"
                                  style={{ width: `${avatarUploadProgress}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={cn(fieldShell, '!p-0 overflow-hidden')}>
                      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Cover image</h2>
                      </div>
                      <div className="p-5">
                        <div
                          className={cn(
                            'mb-4 overflow-hidden rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600',
                          )}
                        >
                          {coverImage ? (
                            <img src={coverImage} alt="" className="h-28 w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex h-28 items-center justify-center bg-slate-100 dark:bg-slate-800">
                              <span className="text-sm text-slate-400">No cover</span>
                            </div>
                          )}
                        </div>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-md hover:bg-primary-700">
                          <Camera className="h-4 w-4" />
                          Change cover
                          <input
                            type="file"
                            className="hidden"
                            accept="image/png, image/jpeg, image/webp"
                            onChange={handleCoverUpload}
                            disabled={coverUploadProgress > 0}
                          />
                        </label>
                        {coverUploadProgress > 0 && (
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div
                              className="h-full rounded-full bg-primary-600 transition-all"
                              style={{ width: `${coverUploadProgress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </div>
          </div>
        </Tabs>

      </form>

      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
        role="region"
        aria-label="Save profile"
      >
        <div className="pointer-events-auto flex w-full max-w-4xl items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-3 shadow-[0_-8px_32px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-slate-700/90 dark:bg-slate-950/95 dark:shadow-[0_-8px_32px_rgba(0,0,0,0.45)]">
          <p className="hidden text-sm text-slate-500 sm:block dark:text-slate-400">
            Changes apply after you save.
          </p>
          <Button
            type="submit"
            form="profile-settings-form"
            loading={loading}
            disabled={loading}
            className="min-w-[160px] px-8 sm:ml-auto"
          >
            Save changes
          </Button>
        </div>
      </div>

      <Modal
        isOpen={showDeactivateModal}
        onClose={() => !loading && setShowDeactivateModal(false)}
        title="Deactivate account?"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            You will not be able to sign in until an admin reactivates your account.
          </p>
          <Input
            label="Current password (if applicable)"
            type="password"
            value={dangerPassword}
            onChange={(e) => setDangerPassword(e.target.value)}
            placeholder="Enter password"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" disabled={loading} onClick={() => setShowDeactivateModal(false)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" loading={loading} disabled={loading} onClick={() => void onDeactivateAccount()}>
              Deactivate
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => !loading && setShowDeleteModal(false)}
        title="Delete account?"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            This action is permanent and cannot be undone.
          </p>
          <Input
            label="Current password (if applicable)"
            type="password"
            value={dangerPassword}
            onChange={(e) => setDangerPassword(e.target.value)}
            placeholder="Enter password"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" disabled={loading} onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" loading={loading} disabled={loading} onClick={() => void onDeleteAccount()}>
              Delete permanently
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}

export default ProfileSettings;
