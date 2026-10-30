import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  readSyncProfileSnapshot,
  fetchAndReconcileSupabaseProfile,
  saveProfileToSupabase,
  getMonogramAvatar
} from '../../utils/profileStorage';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  avatar_url: z.string().optional(),
  school_name: z.string().optional(),
  class_name: z.string().optional(),
  subject: z.string().optional(),
  target_aim: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileForm() {
  const initial = readSyncProfileSnapshot();
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: initial.fullName,
    avatar_url: initial.avatarUrl,
    school_name: initial.schoolName,
    class_name: initial.className,
    subject: initial.subject,
    target_aim: initial.targetAim,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    let isMounted = true;
    fetchAndReconcileSupabaseProfile()
      .then(({ profile }) => {
        if (!isMounted) return;
        setFormData({
          full_name: profile.fullName,
          avatar_url: profile.avatarUrl,
          school_name: profile.schoolName,
          class_name: profile.className,
          subject: profile.subject,
          target_aim: profile.targetAim,
        });
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ProfileFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = profileSchema.safeParse(formData);
    if (!result.success) {
      const formattedErrors: Partial<Record<keyof ProfileFormData, string>> = {};
      result.error.issues.forEach((err) => {
        const key = err.path[0] as keyof ProfileFormData;
        if (key) formattedErrors[key] = err.message;
      });
      setErrors(formattedErrors);
      return;
    }

    setSaving(true);
    setFetchError('');
    setSuccess(false);

    try {
      await saveProfileToSupabase({
        fullName: formData.full_name.trim(),
        avatarUrl: formData.avatar_url?.trim() || getMonogramAvatar(formData.full_name),
        schoolName: formData.school_name?.trim() || '',
        className: formData.class_name?.trim() || '',
        subject: formData.subject?.trim() || '',
        targetAim: formData.target_aim?.trim() || '',
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setFetchError(error.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Profile Settings</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal information, school, and study goals in Supabase.
        </p>
      </div>

      {fetchError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{fetchError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="full_name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Full Name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            value={formData.full_name}
            onChange={handleChange}
            className={`w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors ${
              errors.full_name ? 'border-red-500 dark:border-red-500/50' : 'border-slate-200 dark:border-slate-800'
            }`}
            placeholder="Enter your full name"
          />
          {errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="school_name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              School / Institution
            </label>
            <input
              id="school_name"
              name="school_name"
              type="text"
              value={formData.school_name || ''}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors"
              placeholder="Enter school or university"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="class_name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Class / Grade Level
            </label>
            <input
              id="class_name"
              name="class_name"
              type="text"
              value={formData.class_name || ''}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors"
              placeholder="e.g. Grade 12"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="target_aim" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            My Learning Aim & Goal
          </label>
          <input
            id="target_aim"
            name="target_aim"
            type="text"
            value={formData.target_aim || ''}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors"
            placeholder="e.g. Ace Final Exams / Master Computer Science"
          />
        </div>

        <div className="pt-4 flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed min-w-[140px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Profile'
            )}
          </button>

          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center text-emerald-600 dark:text-emerald-400 text-sm font-medium"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Saved to Supabase
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    </div>
  );
}
