import { useState } from 'react';
import { authApi } from '../../services/api';
import { Button, Input, Card, Alert, PageContainer } from '../../shared/components';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await authApi.forgotPassword(email);
      setMessage('If an account exists for this email, a reset link has been sent.');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer maxWidth="md" className="mt-8">
      <Card>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Forgot password</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          {message && <Alert variant="success">{message}</Alert>}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" fullWidth loading={loading}>
            Send reset link
          </Button>
        </form>
      </Card>
    </PageContainer>
  );
}

export default ForgotPassword;
