import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import { AppDispatch } from '../../store/store';
import { complete2faSetup } from '../../store/slices/authSlice';
import toast from 'react-hot-toast';
import { Button, Input, Card, Alert, PageContainer, Spinner } from '../../shared/components';

function Setup2FA() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [setup, setSetup] = useState<{ qrDataUrl: string; backupCodes: string[] } | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    const doSetup = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await authApi.twofaSetup();
        setSetup({ qrDataUrl: res.data.qrDataUrl, backupCodes: res.data.backupCodes });
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Unable to start 2FA');
        toast.error('Error setting up 2FA');
      } finally {
        setLoading(false);
      }
    };
    doSetup();
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.twofaEnable(code);
      if (res.data.access_token) {
        dispatch(
          complete2faSetup({
            access_token: res.data.access_token,
            refresh_token: res.data.refresh_token,
            user: res.data.user,
          }),
        );
        toast.success('Account secured with 2FA. Welcome!');
        navigate('/');
      } else {
        toast.success('2FA enabled.');
        navigate('/');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Invalid code');
      toast.error('Invalid 2FA code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer maxWidth="md" className="py-12">
      <Card>
        <h1 className="text-2xl font-bold text-white mb-2">Set up 2FA</h1>
        <p className="text-gray-400 mb-6">
          To secure your account, scan the QR code with an app like Google Authenticator or Authy, then enter the 6-digit code.
        </p>

        {loading && !setup && (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        )}

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        {setup && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <img src={setup.qrDataUrl} alt="QR Code 2FA" className="rounded-lg bg-white p-2" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-300 mb-2">Backup codes</h3>
              <p className="text-sm text-gray-400 mb-2">
                Save these codes in a safe place. Each code can only be used once.
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm font-mono bg-gray-900 p-3 rounded text-gray-300">
                {setup.backupCodes.map((c) => (
                  <div key={c}>{c}</div>
                ))}
              </div>
            </div>
            <form onSubmit={onSubmit} className="space-y-3">
              <Input
                label="6-digit code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                required
                className="font-mono text-lg tracking-widest"
              />
              <Button
                type="submit"
                fullWidth
                loading={loading}
                disabled={code.length !== 6}
              >
                Enable 2FA and continue
              </Button>
            </form>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}

export default Setup2FA;