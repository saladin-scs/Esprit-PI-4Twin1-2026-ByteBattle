import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authApi } from '../../services/api';
import { Button, Input, Card, Alert, PageContainer } from '../../shared/components';

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
      setMessage('Password has been reset.');
      setNewPassword('');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error');
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
          <Input
            label="Nouveau mot de passe"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
          <Button type="submit" fullWidth loading={loading} disabled={!token}>
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
