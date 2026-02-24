import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import { fetchMe, verify2faLogin } from '../../store/slices/authSlice';

function SocialCallback() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

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
          navigate('/dashboard');
        })
        .catch(() => {
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
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || '2FA verification failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-gray-800 p-6 rounded-lg text-white">
        {twoFactorToken ? (
          <form onSubmit={onVerify} className="space-y-4">
            <div className="text-lg font-semibold">2FA required</div>
            <p className="text-gray-300">
              Enter your authenticator code (or a backup code) to complete social login.
            </p>
            {error && <div className="bg-red-600 text-white p-3 rounded">{error}</div>}
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="2FA code"
              required
            />
            <button className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg font-semibold">
              Verify
            </button>
          </form>
        ) : (
          <>Completing social login…</>
        )}
      </div>
    </div>
  );
}

export default SocialCallback;

