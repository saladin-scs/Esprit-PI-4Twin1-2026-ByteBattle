import { useState } from 'react';
import { reclamationsApi, type ReclamationCategory } from '../../../services/api';
import { Button, Input, Alert, Textarea } from '../../../shared/components';
import { RECLAMATION_CATEGORIES_SELECT } from '../constants';

type Props = {
  onSuccess: () => void;
};

export function ReclamationForm({ onSuccess }: Props) {
  const [category, setCategory] = useState<ReclamationCategory>('other');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await reclamationsApi.create({
        category,
        subject: subject.trim(),
        message: message.trim(),
      });
      setSuccess('Réclamation envoyée. Tu la retrouveras dans l’onglet « Mes réclamations ».');
      setSubject('');
      setMessage('');
      setCategory('other');
      onSuccess();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } }; message?: string };
      const msg = ax?.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(', ') : msg || ax?.message || 'Impossible d’envoyer la réclamation.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      <div>
        <label
          htmlFor="reclamation-category"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Catégorie
        </label>
        <select
          id="reclamation-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as ReclamationCategory)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {RECLAMATION_CATEGORIES_SELECT.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <Input
        label="Sujet"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        required
        minLength={3}
        maxLength={200}
        placeholder="Résumé court"
      />
      <Textarea
        label="Message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
        minLength={10}
        maxLength={5000}
        rows={8}
        placeholder="Décris la situation avec le plus de précision possible…"
      />
      <Button type="submit" fullWidth loading={loading}>
        Envoyer la réclamation
      </Button>
    </form>
  );
}
