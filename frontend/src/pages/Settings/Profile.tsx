import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { usersApi } from '../../services/api';
import { AppDispatch, RootState } from '../../store/store';
import { fetchMe } from '../../store/slices/authSlice';
import { Button, Input, Textarea, Card, Alert, PageContainer, Avatar } from '../../shared/components';
import { Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const profileSchema = yup.object().shape({
  displayName: yup.string().max(50, 'Display name cannot exceed 50 characters').nullable(),
  firstName: yup.string().max(50, 'First name cannot exceed 50 characters').nullable(),
  lastName: yup.string().max(50, 'Last name cannot exceed 50 characters').nullable(),
  phone: yup.string().max(30, 'Phone cannot exceed 30 characters').nullable(),
  dateOfBirth: yup.date().max(new Date(), 'Date of birth cannot be in the future').nullable(),
  bio: yup.string().max(500, 'Bio cannot exceed 500 characters').nullable(),
  country: yup.string().max(2, 'Country code must be 2 characters').nullable(),
  newsletter: yup.boolean().nullable(),
  referralSource: yup.string().nullable(),
  github: yup.string().url('Must be a valid URL').nullable(),
  linkedin: yup.string().url('Must be a valid URL').nullable(),
  twitter: yup.string().url('Must be a valid URL').nullable(),
  portfolio: yup.string().url('Must be a valid URL').nullable(),
  links: yup.string().nullable()
});

type ProfileFormData = yup.InferType<typeof profileSchema>;

function ProfileSettings() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preferencesRest, setPreferencesRest] = useState<Record<string, unknown>>({});
  
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<ProfileFormData>({
    resolver: yupResolver(profileSchema) as any,
    defaultValues: {
      displayName: user?.displayName || '',
      firstName: '',
      lastName: '',
      phone: '',
      dateOfBirth: null,
      bio: '',
      country: '',
      newsletter: false,
      referralSource: '',
      github: '',
      linkedin: '',
      twitter: '',
      portfolio: '',
      links: ''
    }
  });

  useEffect(() => {
    setAvatarUrl(user?.avatarUrl || '');
    setCoverImage((user as any)?.coverImage || (user as any)?.coverUrl || '');
  }, [user?.avatarUrl, (user as any)?.coverImage, (user as any)?.coverUrl]);

  useEffect(() => {
    (async () => {
      try {
        const res = await usersApi.me();
        const u = res.data as any;
        
        const prefs = u.preferences || {};
        const { newsletter: _n, referralSource: _r, ...rest } = prefs;
        setPreferencesRest(rest as Record<string, unknown>);
        setAvatarUrl(u.avatarUrl || '');
        setCoverImage(u.coverImage || u.coverUrl || '');
        
        reset({
          displayName: u.displayName || '',
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          phone: u.phone || '',
          dateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth) : null,
          bio: u.bio || '',
          country: u.country || '',
          newsletter: !!prefs.newsletter,
          referralSource: prefs.referralSource || '',
          github: u.socialLinks?.github || '',
          linkedin: u.socialLinks?.linkedin || '',
          twitter: u.socialLinks?.twitter || '',
          portfolio: u.socialLinks?.portfolio || '',
          links: Array.isArray(u.links) ? u.links.join('\n') : ''
        });
      } catch {
        // ignore
      }
    })();
  }, [reset]);

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
      setCoverImage(res.data?.coverImage || res.data?.coverUrl || res.data?.url || res.data || coverImage);
      toast.success('Cover uploaded successfully');
      dispatch(fetchMe());
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to upload cover');
    } finally {
      setCoverUploadProgress(0);
      e.target.value = ''; // reset input
    }
  };

  const onSave = async (data: ProfileFormData) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const linkArr = (data.links || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
        
      await usersApi.updateMe({
        displayName: data.displayName || undefined,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
        phone: data.phone || undefined,
        dateOfBirth: data.dateOfBirth ? data.dateOfBirth.toISOString().slice(0, 10) : undefined,
        bio: data.bio || undefined,
        country: data.country || undefined,
        avatarUrl: avatarUrl || undefined,
        coverImage: coverImage || undefined,
        links: linkArr.length ? linkArr : undefined,
        preferences: {
          ...preferencesRest,
          newsletter: data.newsletter,
          referralSource: data.referralSource || undefined,
        },
        socialLinks: {
          github: data.github || undefined,
          linkedin: data.linkedin || undefined,
          twitter: data.twitter || undefined,
          portfolio: data.portfolio || undefined,
        },
      });
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

      <Card title="">
        <form onSubmit={handleSubmit(onSave)} className="space-y-6">
          {error && <Alert variant="error">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Account</h2>
            <Input
              label="Email"
              value={(user as any)?.email || ''}
              disabled
              title="Email cannot be changed here"
            />
            <Input
              label="Username"
              value={(user as any)?.username || ''}
              disabled
              title="Username cannot be changed here"
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Personal</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="First name"
                  placeholder="John"
                  {...register('firstName')}
                />
                {errors.firstName && <span className="text-red-500 text-sm">{errors.firstName.message}</span>}
              </div>
              <div>
                <Input
                  label="Last name"
                  placeholder="Doe"
                  {...register('lastName')}
                />
                {errors.lastName && <span className="text-red-500 text-sm">{errors.lastName.message}</span>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <PhoneInput
                    country="us"
                    value={field.value || ''}
                    onChange={(v) => field.onChange(v)}
                    inputClass="!w-full !bg-white dark:!bg-gray-800 !text-gray-900 dark:!text-white !border-gray-300 dark:!border-gray-600 !rounded-lg !px-4 !py-2"
                    containerClass="w-full"
                    buttonClass="!bg-gray-100 dark:!bg-gray-700 !border-gray-300 dark:!border-gray-600"
                  />
                )}
              />
              {errors.phone && <span className="text-red-500 text-sm">{errors.phone.message}</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of birth</label>
              <Controller
                name="dateOfBirth"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    selected={field.value}
                    onChange={(d: Date | null) => field.onChange(d)}
                    maxDate={new Date()}
                    showYearDropdown
                    scrollableYearDropdown
                    placeholderText="Select date"
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                )}
              />
              {errors.dateOfBirth && <span className="text-red-500 text-sm">{errors.dateOfBirth.message}</span>}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Profile</h2>
            <div>
              <Input
                label="Display name"
                {...register('displayName')}
              />
              {errors.displayName && <span className="text-red-500 text-sm">{errors.displayName.message}</span>}
            </div>
            <div>
              <Textarea
                label="Bio"
                rows={4}
                {...register('bio')}
              />
              {errors.bio && <span className="text-red-500 text-sm">{errors.bio.message}</span>}
            </div>
            <div>
              <Input
                label="Country (ISO2)"
                maxLength={2}
                {...register('country')}
              />
              {errors.country && <span className="text-red-500 text-sm">{errors.country.message}</span>}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Preferences</h2>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="newsletter"
                {...register('newsletter')}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 focus:ring-blue-500"
              />
              <label htmlFor="newsletter" className="text-sm text-gray-700 dark:text-gray-300">Subscribe to newsletter</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">How did you hear about us?</label>
              <select
                {...register('referralSource')}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
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

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Social links</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input label="GitHub URL" type="url" placeholder="https://github.com/..." {...register('github')} />
                {errors.github && <span className="text-red-500 text-sm">{errors.github.message}</span>}
              </div>
              <div>
                <Input label="LinkedIn URL" type="url" placeholder="https://linkedin.com/..." {...register('linkedin')} />
                {errors.linkedin && <span className="text-red-500 text-sm">{errors.linkedin.message}</span>}
              </div>
              <div>
                <Input label="Twitter / X URL" type="url" placeholder="https://twitter.com/..." {...register('twitter')} />
                {errors.twitter && <span className="text-red-500 text-sm">{errors.twitter.message}</span>}
              </div>
              <div>
                <Input label="Portfolio URL" type="url" placeholder="https://..." {...register('portfolio')} />
                {errors.portfolio && <span className="text-red-500 text-sm">{errors.portfolio.message}</span>}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Media</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Avatar Upload */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Avatar Image</label>
              <div className="flex items-center space-x-4 relative">
                <Avatar src={avatarUrl} fallback={user?.displayName || user?.username || '?'} size="lg" className="w-20 h-20" />
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
                {coverImage ? (
                  <div className="relative w-full h-20 rounded overflow-hidden mb-2">
                    <img src={coverImage} alt="Cover" loading="lazy" className="w-full h-full object-cover" />
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
          </div>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Links</h2>
            <div>
              <Textarea
                label="Links (one per line)"
                rows={4}
                {...register('links')}
              />
              {errors.links && <span className="text-red-500 text-sm">{errors.links.message}</span>}
            </div>
          </div>
          <Button type="submit" loading={loading} disabled={loading}>
            Save
          </Button>
        </form>
      </Card>
      </motion.div>
    </PageContainer>
  );
}

export default ProfileSettings;