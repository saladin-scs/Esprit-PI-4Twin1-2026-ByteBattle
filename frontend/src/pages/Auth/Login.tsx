import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { login, verify2faLogin } from '../../store/slices/authSlice';
import { AppDispatch } from '../../store/store';
import { Button, Input, Card, Alert, PageContainer, Checkbox } from '../../shared/components';

function Login() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const redirectToSocial = (provider: 'google' | 'github') => {
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await dispatch(login({ email, password, rememberMe })).unwrap();
      if (res?.twoFactorRequired && res?.twoFactorToken) {
        setTwoFactorToken(res.twoFactorToken);
        return;
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorToken) return;
    setError('');
    setLoading(true);
    try {
      await dispatch(verify2faLogin({ twoFactorToken, code: twoFactorCode, rememberMe })).unwrap();
      setTwoFactorToken(null);
      setTwoFactorCode('');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || '2FA verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer maxWidth="md" className="mt-8">
      <Card>
        <h2 className="text-2xl font-bold text-white mb-6">Connexion</h2>
        {!twoFactorToken ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="error" className="mb-4">{error}</Alert>
            )}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="flex items-center justify-between">
              <Checkbox
                label="Se souvenir de moi"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
            </div>
            <Button type="submit" fullWidth loading={loading}>
              Connexion
            </Button>
            <div className="mt-4 text-sm text-gray-300">
              <Link className="text-blue-400 hover:underline" to="/forgot-password">
                Mot de passe oublié ?
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerify2fa} className="space-y-4">
            {error && (
              <Alert variant="error" className="mb-4">{error}</Alert>
            )}
            <p className="text-gray-300 mb-4">
              Authentification à deux facteurs activée. Entrez votre code à 6 chiffres (ou un code de secours).
            </p>
            <Input
              label="Code 2FA"
              type="text"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              required
            />
            <Button type="submit" fullWidth loading={loading}>
              Vérifier
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => {
                setTwoFactorToken(null);
                setTwoFactorCode('');
              }}
              className="mt-3"
            >
              Retour
            </Button>
          </form>
        )}
        <div className="mt-6 space-y-3 border-t border-gray-700 pt-6">
          <Button
            type="button"
            variant="danger"
            fullWidth
            onClick={() => redirectToSocial('google')}
          >
            Continuer avec Google
          </Button>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={() => redirectToSocial('github')}
          >
            Continuer avec GitHub
          </Button>
        </div>
      </Card>
    </PageContainer>
  );
}

export default Login;
