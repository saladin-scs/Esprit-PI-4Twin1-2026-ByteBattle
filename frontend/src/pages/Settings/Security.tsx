import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authApi, usersApi } from '../../services/api';
import { AppDispatch, RootState } from '../../store/store';
import { fetchMe, logout } from '../../store/slices/authSlice';
import { Button, Input, Card, Alert, PageContainer } from '../../shared/components';
import { usePopup } from '../../contexts/PopupContext';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const changePasswordSchema = yup.object().shape({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup.string()
    .required('New password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Must contain at least one lowercase letter')
    .matches(/[0-9]/, 'Must contain at least one number')
    .matches(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  confirmNewPassword: yup.string()
    .required('Please confirm your new password')
    .oneOf([yup.ref('newPassword')], 'Passwords must match'),
});

const twoFactorCodeSchema = yup.object().shape({
  code: yup.string().required('Code is required').matches(/^\d{6}$/, 'Code must be 6 digits')
});

const twoFactorDisableSchema = yup.object().shape({
  code: yup.string().required('Code is required')
});

const emailResendSchema = yup.object().shape({
  email: yup.string().email('Invalid email format').required('Email is required')
});

type ChangePasswordFormData = yup.InferType<typeof changePasswordSchema>;
type TwoFactorFormData = yup.InferType<typeof twoFactorCodeSchema>;
type TwoFactorDisableFormData = yup.InferType<typeof twoFactorDisableSchema>;
type EmailResendFormData = yup.InferType<typeof emailResendSchema>;

function SecuritySettings() {
  const dispatch = useDispatch<AppDispatch>();
  const { confirm } = usePopup();
  const { user, refreshToken } = useSelector((s: RootState) => s.auth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [twofaSetup, setTwofaSetup] = useState<{ qrDataUrl: string; backupCodes: string[] } | null>(null);

  const pwdForm = useForm<ChangePasswordFormData>({
    resolver: yupResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' }
  });

  const emailForm = useForm<EmailResendFormData>({
    resolver: yupResolver(emailResendSchema),
    defaultValues: { email: user?.email || '' }
  });

  const enable2faForm = useForm<TwoFactorFormData>({
    resolver: yupResolver(twoFactorCodeSchema),
    defaultValues: { code: '' }
  });

  const disable2faForm = useForm<TwoFactorDisableFormData>({
    resolver: yupResolver(twoFactorDisableSchema),
    defaultValues: { code: '' }
  });

  const onChangePassword = async (data: ChangePasswordFormData) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await usersApi.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      pwdForm.reset();
      setSuccess('Password changed successfully.');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const onResendVerification = async (data: EmailResendFormData) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await authApi.resendVerification(data.email);
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

  const onEnable2fa = async (data: TwoFactorFormData) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await authApi.twofaEnable(data.code);
      setSuccess('2FA enabled.');
      setTwofaSetup(null);
      enable2faForm.reset();
      await dispatch(fetchMe());
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const onDisable2fa = async (data: TwoFactorDisableFormData) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await authApi.twofaDisable(data.code);
      setSuccess('2FA disabled.');
      disable2faForm.reset();
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
          <form onSubmit={emailForm.handleSubmit(onResendVerification)} className="flex flex-col sm:flex-row gap-3 items-start">
            <div className="flex-1 w-full">
              <Input
                {...emailForm.register('email')}
                placeholder="Email"
                className="w-full"
              />
              {emailForm.formState.errors.email && <p className="text-red-500 text-sm mt-1">{emailForm.formState.errors.email.message}</p>}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="submit" disabled={loading} loading={loading} className="whitespace-nowrap">
                Resend
              </Button>
              <Button type="button" variant="secondary" onClick={() => dispatch(fetchMe())} className="whitespace-nowrap">
                Refresh
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Change password">
          <form onSubmit={pwdForm.handleSubmit(onChangePassword)} className="space-y-4">
            <div>
              <Input
                label="Current password"
                type="password"
                {...pwdForm.register('currentPassword')}
              />
              {pwdForm.formState.errors.currentPassword && <p className="text-red-500 text-sm mt-1">{pwdForm.formState.errors.currentPassword.message}</p>}
            </div>
            <div>
              <Input
                label="New password"
                type="password"
                {...pwdForm.register('newPassword')}
              />
              {pwdForm.formState.errors.newPassword && <p className="text-red-500 text-sm mt-1">{pwdForm.formState.errors.newPassword.message}</p>}
            </div>
            <div>
              <Input
                label="Confirm new password"
                type="password"
                {...pwdForm.register('confirmNewPassword')}
              />
              {pwdForm.formState.errors.confirmNewPassword && <p className="text-red-500 text-sm mt-1">{pwdForm.formState.errors.confirmNewPassword.message}</p>}
            </div>
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
              <form onSubmit={enable2faForm.handleSubmit(onEnable2fa)} className="space-y-3">
                <div>
                  <Input
                    label="Code 2FA"
                    type="text"
                    {...enable2faForm.register('code')}
                  />
                  {enable2faForm.formState.errors.code && <p className="text-red-500 text-sm mt-1">{enable2faForm.formState.errors.code.message}</p>}
                </div>
                <Button type="submit" disabled={loading} loading={loading}>
                  Enable 2FA
                </Button>
              </form>
            </div>
          )}

          {user?.twoFactorEnabled && (
            <form onSubmit={disable2faForm.handleSubmit(onDisable2fa)} className="space-y-3">
              <p className="text-gray-700 dark:text-gray-300">
                To disable 2FA, enter a valid code (TOTP or backup code).
              </p>
              <div>
                <Input
                  label="Code 2FA"
                  type="text"
                  {...disable2faForm.register('code')}
                />
                {disable2faForm.formState.errors.code && <p className="text-red-500 text-sm mt-1">{disable2faForm.formState.errors.code.message}</p>}
              </div>
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
