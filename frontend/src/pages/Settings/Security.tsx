import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authApi, usersApi } from '../../services/api';
import { AppDispatch, RootState } from '../../store/store';
import { fetchMe, logout } from '../../store/slices/authSlice';
import { Button, Input, Card, Alert, PageContainer } from '../../shared/components';
import { usePopup } from '../../contexts/PopupContext';

function SecuritySettings() {
  const dispatch = useDispatch<AppDispatch>();
  const { confirm } = usePopup();
  const { user, refreshToken } = useSelector((s: RootState) => s.auth);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [twofaSetup, setTwofaSetup] = useState<{ qrDataUrl: string; backupCodes: string[] } | null>(null);
  const [twofaCode, setTwofaCode] = useState('');
  const [twofaDisableCode, setTwofaDisableCode] = useState('');

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await usersApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setSuccess('Password changed.');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const onResendVerification = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await authApi.resendVerification(email || user?.email || '');
      setSuccess('Verification email sent (if the account exists).');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    const accepted = await confirm({
      title: 'Log out',
      message: 'Are you sure you want to disconnect?',
      confirmText: 'Log out',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!accepted) return;
    try {
      await authApi.logout(refreshToken || undefined);
    } catch {
      // ignore
    } finally {
      dispatch(logout());
    }
  };

  const onStart2faSetup = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await authApi.twofaSetup();
      setTwofaSetup({ qrDataUrl: res.data.qrDataUrl, backupCodes: res.data.backupCodes });
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const onEnable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await authApi.twofaEnable(twofaCode);
      setSuccess('2FA enabled.');
      setTwofaSetup(null);
      setTwofaCode('');
      await dispatch(fetchMe());
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const onDisable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await authApi.twofaDisable(twofaDisableCode);
      setSuccess('2FA disabled.');
      setTwofaDisableCode('');
      setTwofaSetup(null);
      await dispatch(fetchMe());
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer maxWidth="2xl" className="py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Security</h1>

      <div className="space-y-8">
        {(error || success) && (
          <>
            {error && <Alert variant="error">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}
          </>
        )}

        <Card title="Email verification">
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Status: {user?.emailVerifiedAt ? 'Verified' : 'Not verified'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="flex-1"
            />
            <Button onClick={onResendVerification} disabled={loading} loading={loading}>
              Resend
            </Button>
            <Button variant="secondary" onClick={() => dispatch(fetchMe())}>
              Refresh
            </Button>
          </div>
        </Card>

        <Card title="Change password">
          <form onSubmit={onChangePassword} className="space-y-4">
            <Input
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
            <Button type="submit" disabled={loading} loading={loading}>
              Update
            </Button>
          </form>
        </Card>

        <Card title="Two-factor authentication">
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Status: {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
          </p>

          {!user?.twoFactorEnabled && !twofaSetup && (
            <Button onClick={onStart2faSetup} disabled={loading} loading={loading}>
              Start 2FA setup
            </Button>
          )}

          {twofaSetup && !user?.twoFactorEnabled && (
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                Scan this QR code with Google Authenticator or Authy, then enter the generated code.
              </p>
              <img src={twofaSetup.qrDataUrl} alt="QR code 2FA" className="mx-auto" />
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Backup codes</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Save these codes in a safe place. Each code can only be used once.
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm font-mono bg-gray-100 dark:bg-gray-900 p-3 rounded text-gray-800 dark:text-gray-300">
                  {twofaSetup.backupCodes.map((c) => (
                    <div key={c}>{c}</div>
                  ))}
                </div>
              </div>
              <form onSubmit={onEnable2fa} className="space-y-3">
                <Input
                  label="Code 2FA"
                  type="text"
                  value={twofaCode}
                  onChange={(e) => setTwofaCode(e.target.value)}
                  required
                />
                <Button type="submit" disabled={loading} loading={loading}>
                  Enable 2FA
                </Button>
              </form>
            </div>
          )}

          {user?.twoFactorEnabled && (
            <form onSubmit={onDisable2fa} className="space-y-3">
              <p className="text-gray-700 dark:text-gray-300">
                To disable 2FA, enter a valid code (TOTP or backup code).
              </p>
              <Input
                label="Code 2FA"
                type="text"
                value={twofaDisableCode}
                onChange={(e) => setTwofaDisableCode(e.target.value)}
                required
              />
              <Button type="submit" variant="danger" disabled={loading} loading={loading}>
                Disable 2FA
              </Button>
            </form>
          )}
        </Card>

        <Card title="Session">
          <Button variant="danger" onClick={onLogout}>
            Log out
          </Button>
        </Card>
      </div>
    </PageContainer>
  );
}

export default SecuritySettings;
