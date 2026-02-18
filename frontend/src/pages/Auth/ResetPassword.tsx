import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authApi } from '../../services/api';

function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await authApi.resetPassword(token, newPassword);
      setMessage('Mot de passe réinitialisé.');
      setNewPassword('');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-gray-800 p-8 rounded-lg">
        <h2 className="text-2xl font-bold mb-6">Réinitialiser le mot de passe</h2>
        <form onSubmit={onSubmit}>
          {error && <div className="bg-red-600 text-white p-3 rounded mb-4">{error}</div>}
          {message && <div className="bg-green-700 text-white p-3 rounded mb-4">{message}</div>}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
              minLength={8}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white py-2 rounded-lg font-semibold"
          >
            {loading ? 'En cours…' : 'Valider'}
          </button>
          {!token && (
            <p className="text-gray-400 text-sm mt-3">Token manquant dans l’URL.</p>
          )}
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;

