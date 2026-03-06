import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authApi } from '../../services/api';
import { Button, Card, Alert, PageContainer } from '../../shared/components';

function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Password match validation
  const passwordsMatch = newPassword === confirmPassword;
  const isSubmitDisabled = !token || !newPassword || !confirmPassword || !passwordsMatch;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Extra safety check
    if (!passwordsMatch) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, newPassword);
      setMessage('Mot de passe réinitialisé avec succès.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer maxWidth="md" className="mt-8">
      <Card>
        <h2 className="text-2xl font-bold text-white mb-6">Réinitialiser le mot de passe</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          {message && <Alert variant="success">{message}</Alert>}

          {/* Nouveau mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nouveau mot de passe <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                placeholder="********"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2 text-gray-400 hover:text-white"
              >
                {showPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>

          {/* Confirmer le mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirmer le mot de passe <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className={`w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 text-white ${
                  confirmPassword && !passwordsMatch
                    ? 'border-red-500 focus:ring-red-500'
                    : 'focus:ring-blue-500'
                }`}
                placeholder="********"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2 text-gray-400 hover:text-white"
              >
                {showConfirmPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="text-red-500 text-xs mt-1">Les mots de passe ne correspondent pas.</p>
            )}
          </div>

          <Button
            type="submit"
            fullWidth
            loading={loading}
            disabled={isSubmitDisabled}
          >
            Valider
          </Button>

          {!token && (
            <p className="text-gray-400 text-sm mt-3">Token manquant dans l’URL.</p>
          )}
        </form>
      </Card>
    </PageContainer>
  );
}

export default ResetPassword;