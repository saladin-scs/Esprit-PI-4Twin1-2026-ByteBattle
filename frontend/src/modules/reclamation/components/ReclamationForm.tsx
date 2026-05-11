<<<<<<< HEAD
import { useState } from 'react';
import { reclamationsApi } from '../../../services/api'; // removed unused ReclamationCategory
import { Button, Input, Alert, Textarea } from '../../../shared/components';
import { TAG_SELECT_OPTIONS, mapTagToCategory, type ReportTag } from '../constants';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

type Props = {
  onSuccess: () => void;
};

const reclamationSchema = yup.object().shape({
  tag: yup.mixed<ReportTag>().required('Tag is required'),
  subject: yup.string()
    .required('Subject is required')
    .min(3, 'Subject must be at least 3 characters')
    .max(200, 'Subject cannot exceed 200 characters'),
  message: yup.string()
    .required('Message is required')
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message cannot exceed 5000 characters')
});

type ReclamationFormData = yup.InferType<typeof reclamationSchema>;

export function ReclamationForm({ onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ReclamationFormData>({
    resolver: yupResolver(reclamationSchema),
    defaultValues: {
      tag: 'other',
      subject: '',
      message: ''
    }
  });

  const onSubmitHandler = async (data: ReclamationFormData) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // Send both category (for legacy) and tag (for new urgency system)
      await reclamationsApi.create({
        category: mapTagToCategory(data.tag),
        tag: data.tag,           // extra field – ensure your API accepts it
        subject: data.subject.trim(),
        message: data.message.trim(),
      } as any); // cast to bypass strict type checking; update API types later
      setSuccess('Report sent. You can find it in the "My reports" tab.');
      reset();
      onSuccess();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } }; message?: string };
      const msg = ax?.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(', ') : msg || ax?.message || 'Unable to send report.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      <div>
        <label htmlFor="report-tag" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Issue tag <span className="text-xs text-gray-500">(determines urgency)</span>
        </label>
        <select
          id="report-tag"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          {...register('tag')}
        >
          {TAG_SELECT_OPTIONS.map((tag) => (
            <option key={tag.value} value={tag.value}>
              {tag.label}
            </option>
          ))}
        </select>
        {errors.tag && <p className="text-red-500 text-sm mt-1">{errors.tag.message}</p>}
      </div>
      <div>
        <Input label="Subject" placeholder="Short summary" {...register('subject')} />
        {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject.message}</p>}
      </div>
      <div>
        <Textarea
          label="Message"
          rows={8}
          placeholder="Describe the situation with as much detail as possible..."
          {...register('message')}
        />
        {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message.message}</p>}
      </div>
      <Button type="submit" fullWidth loading={loading}>
        Send report
      </Button>
    </form>
  );
}
=======
import { useState } from 'react';
import { reclamationsApi, type ReclamationCategory } from '../../../services/api';
import { Button, Input, Alert, Textarea } from '../../../shared/components';
import { RECLAMATION_CATEGORIES_SELECT } from '../constants';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

type Props = {
  onSuccess: () => void;
};

const reclamationSchema = yup.object().shape({
  category: yup.mixed<ReclamationCategory>().required('Category is required'),
  subject: yup.string()
    .required('Subject is required')
    .min(3, 'Subject must be at least 3 characters')
    .max(200, 'Subject cannot exceed 200 characters'),
  message: yup.string()
    .required('Message is required')
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message cannot exceed 5000 characters')
});

type ReclamationFormData = yup.InferType<typeof reclamationSchema>;

export function ReclamationForm({ onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ReclamationFormData>({
    resolver: yupResolver(reclamationSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      category: 'other',
      subject: '',
      message: ''
    }
  });

  const onSubmitHandler = async (data: ReclamationFormData) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await reclamationsApi.create({
        category: data.category,
        subject: data.subject.trim(),
        message: data.message.trim(),
      });
      setSuccess('Report sent. You can find it in the "My reports" tab.');
      reset();
      onSuccess();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } }; message?: string };
      const msg = ax?.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(', ') : msg || ax?.message || 'Unable to send report.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      <div>
        <label
          htmlFor="reclamation-category"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Category
        </label>
        <select
          id="reclamation-category"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          {...register('category')}
        >
          {RECLAMATION_CATEGORIES_SELECT.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>}
      </div>
      <div>
        <Input
          label="Subject"
          placeholder="Short summary"
          error={errors.subject?.message}
          {...register('subject')}
        />
      </div>
      <div>
        <Textarea
          label="Message"
          rows={8}
          placeholder="Describe the situation with as much detail as possible..."
          error={errors.message?.message}
          {...register('message')}
        />
      </div>
      <Button type="submit" fullWidth loading={loading}>
        Send report
      </Button>
    </form>
  );
}
>>>>>>> origin/saladin
