import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  avatar_url: z.string().url('Must be a valid URL').or(z.literal('')),
  academic_level: z.string().min(1, 'Academic level is required'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileForm() {
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    avatar_url: '',
    academic_level: '',
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormData, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setFetchError('');
    try {
      if (!supabase) throw new Error('Supabase client not initialized');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, academic_level')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setFormData({
            full_name: data.full_name || '',
            avatar_url: data.avatar_url || '',
            academic_level: data.academic_level || '',
          });
        }
      } else {
        // If no user session, mock or show error based on requirements. 
        // We'll just leave it empty if no session.
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setFetchError('Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error on type
    if (errors[name as keyof ProfileFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate with Zod
    const result = profileSchema.safeParse(formData);
    if (!result.success) {
      const formattedErrors: any = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) formattedErrors[err.path[0]] = err.message;
      });
      setErrors(formattedErrors);
      return;
    }

    setSaving(true);
    setFetchError('');
    setSuccess(false);
    
    try {
      if (!supabase) throw new Error('Supabase client not initialized');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) throw new Error('You must be logged in to update your profile');

      const updates = {
        id: session.user.id,
        ...formData,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      localStorage.setItem('studyweb_profile_name', formData.full_name);
      localStorage.setItem('studyweb_profile_avatar', formData.avatar_url);
      localStorage.setItem('studyweb_profile_class_board', formData.academic_level);
      if (error) throw error;
      
      setSuccess(true);
      // Optional: hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setFetchError(error.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Profile Settings</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal information and academic details.
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
            placeholder="e.g. Alex Johnson"
          />
          {errors.full_name && (
            <p className="text-xs text-red-500">{errors.full_name}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="academic_level" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Academic Level / Class Board
          </label>
          <input
            id="academic_level"
            name="academic_level"
            type="text"
            value={formData.academic_level}
            onChange={handleChange}
            className={`w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors ${
              errors.academic_level ? 'border-red-500 dark:border-red-500/50' : 'border-slate-200 dark:border-slate-800'
            }`}
            placeholder="e.g. Advanced Placement AP US Curriculum"
          />
          {errors.academic_level && (
            <p className="text-xs text-red-500">{errors.academic_level}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="avatar_url" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Avatar URL (Optional)
          </label>
          <div className="flex gap-4 items-center">
            {formData.avatar_url && !errors.avatar_url ? (
              <img 
                src={formData.avatar_url} 
                alt="Avatar preview" 
                className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(formData.full_name || 'User'); }}
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-300 dark:border-slate-700">
                 <span className="text-slate-500 text-xs font-bold">{formData.full_name ? formData.full_name.charAt(0).toUpperCase() : '?'}</span>
              </div>
            )}
            <input
              id="avatar_url"
              name="avatar_url"
              type="text"
              value={formData.avatar_url}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors ${
                errors.avatar_url ? 'border-red-500 dark:border-red-500/50' : 'border-slate-200 dark:border-slate-800'
              }`}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>
          {errors.avatar_url && (
            <p className="text-xs text-red-500">{errors.avatar_url}</p>
          )}
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
              'Save Changes'
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
                Profile updated successfully
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    </div>
  );
}
