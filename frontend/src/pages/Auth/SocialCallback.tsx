import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import { fetchMe, verify2faLogin, unwrapRejectedMessage } from '../../store/slices/authSlice';
import { PageContainer, Card, Input, Button, Alert } from '../../shared/components';

function SocialCallback() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const redirectTarget = sessionStorage.getItem('social_auth_redirect') || '/dashboard';

  const finishSocialFlow = (target: string) => {
    sessionStorage.removeItem('social_auth_redirect');
    navigate(target, { replace: true });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const twoFactorRequired = params.get('two_factor_required');
    const twoFactorTokenParam = params.get('two_factor_token');

    if (twoFactorRequired === 'true' && twoFactorTokenParam) {
      setTwoFactorToken(twoFactorTokenParam);
      return;
    }

    if (accessToken) {
      localStorage.setItem('token', accessToken);
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }

      dispatch(fetchMe())
        .unwrap()
        .then(() => {
          finishSocialFlow(redirectTarget);
        })
        .catch((err) => {
          console.warn('fetchMe after OAuth:', unwrapRejectedMessage(err, 'Session could not be loaded'));
          navigate('/');
        });
    } else {
      navigate('/login');
    }
  }, [dispatch, navigate]);

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorToken) return;
    setError('');
    try {
      await dispatch(verify2faLogin({ twoFactorToken, code, rememberMe: true })).unwrap();
      finishSocialFlow(redirectTarget);
    } catch (err: unknown) {
      setError(unwrapRejectedMessage(err, '2FA verification failed'));
    }
  };

  return (
    <PageContainer maxWidth="sm" className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-md">
        {twoFactorToken ? (
          <form onSubmit={onVerify} className="space-y-4">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">2FA required</div>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Enter the code from your authenticator app (or a backup code) to complete social sign-in.
            </p>
            {error && <Alert variant="error">{error}</Alert>}
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code 2FA"
              required
            />
            <Button type="submit" fullWidth>
              Verify
            </Button>
          </form>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">Completing social login…</p>
        )}
      </Card>
    </PageContainer>
  );
}

export default SocialCallback;
