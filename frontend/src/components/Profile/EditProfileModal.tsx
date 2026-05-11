import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { usersApi } from '../../services/api';
import type { FullProfile } from '../../types/profile';
import toast from 'react-hot-toast';
import { Button } from '../../shared/components';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: FullProfile | null;
  onSaved: () => void;
}

interface FormData {
  displayName: string;
  bio: string;
  avatarUrl: string;
  coverImage: string;
  github: string;
  linkedin: string;
  twitter: string;
  portfolio: string;
}

export default function EditProfileModal({ isOpen, onClose, profile, onSaved }: EditProfileModalProps) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();

  useEffect(() => {
    if (profile && isOpen) {
      reset({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        avatarUrl: profile.avatarUrl || '',
        coverImage: profile.coverImage || '',
        github: profile.socialLinks?.github || '',
        linkedin: profile.socialLinks?.linkedin || '',
        twitter: profile.socialLinks?.twitter || '',
        portfolio: profile.socialLinks?.portfolio || '',
      });
    }
  }, [profile, isOpen, reset]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      await usersApi.updateMe({
        displayName: data.displayName || undefined,
        bio: data.bio || undefined,
        avatarUrl: data.avatarUrl || undefined,
        coverImage: data.coverImage || undefined,
        socialLinks: {
          github: data.github || undefined,
          linkedin: data.linkedin || undefined,
          twitter: data.twitter || undefined,
          portfolio: data.portfolio || undefined,
        },
      });
      toast.success('Profile updated');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-transparent"
        >
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit profile</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display name</label>
                <input
                  {...register('displayName', { maxLength: 50 })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  placeholder="Display name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                <textarea
                  {...register('bio', { maxLength: 500 })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  placeholder="A few words about you..."
                />
                {errors.bio && <p className="text-red-400 text-xs mt-1">Max 500 characters</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Avatar URL</label>
                <input
                  {...register('avatarUrl')}
                  type="url"
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cover image URL</label>
                <input
                  {...register('coverImage')}
                  type="url"
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Social links</div>
                <div className="space-y-2">
                  <input {...register('github')} type="url" placeholder="GitHub" className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 text-sm focus:ring-2 focus:ring-blue-500" />
                  <input {...register('linkedin')} type="url" placeholder="LinkedIn" className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 text-sm focus:ring-2 focus:ring-blue-500" />
                  <input {...register('twitter')} type="url" placeholder="Twitter / X" className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 text-sm focus:ring-2 focus:ring-blue-500" />
                  <input {...register('portfolio')} type="url" placeholder="Portfolio" className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} loading={saving} className="flex-1">
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
