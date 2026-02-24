import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { login, verify2faLogin } from '../../store/slices/authSlice';
import { AppDispatch } from '../../store/store';

function Login() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const redirectToSocial = (provider: 'google' | 'github') => {
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await dispatch(login({ email, password, rememberMe })).unwrap();
      if (res?.twoFactorRequired && res?.twoFactorToken) {
        setTwoFactorToken(res.twoFactorToken);
        return;
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorToken) return;
    setError('');
    try {
      await dispatch(verify2faLogin({ twoFactorToken, code: twoFactorCode, rememberMe })).unwrap();
      setTwoFactorToken(null);
      setTwoFactorCode('');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || '2FA verification failed');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-gray-800 p-8 rounded-lg">
        <h2 className="text-2xl font-bold mb-6">Login</h2>
        {!twoFactorToken ? (
          <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-600 text-white p-3 rounded mb-4">{error}</div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div className="mb-6 flex items-center justify-between">
            <label className="inline-flex items-center text-sm text-gray-300">
              <input
                type="checkbox"
                className="mr-2 rounded border-gray-600 bg-gray-700 text-primary-500 focus:ring-primary-500"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
          </div>
          <button
            type="submit"
            className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg font-semibold"
          >
            Login
          </button>
          <div className="mt-4 text-sm text-gray-300">
            <Link className="text-primary-400 hover:underline" to="/forgot-password">
              Mot de passe oublié ?
            </Link>
          </div>
        </form>
        ) : (
          <form onSubmit={handleVerify2fa}>
            {error && (
              <div className="bg-red-600 text-white p-3 rounded mb-4">{error}</div>
            )}
            <p className="text-gray-300 mb-4">
              Two-factor authentication is enabled. Enter your 6-digit code (or a backup code).
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">2FA Code</label>
              <input
                type="text"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg font-semibold"
            >
              Verify
            </button>
            <button
              type="button"
              onClick={() => {
                setTwoFactorToken(null);
                setTwoFactorCode('');
              }}
              className="w-full mt-3 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-semibold"
            >
              Back
            </button>
          </form>
        )}
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => redirectToSocial('google')}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold"
          >
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => redirectToSocial('github')}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-semibold"
          >
            Continue with GitHub
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;

