import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { login, verify2faLogin } from '../../store/slices/authSlice';
import { AppDispatch } from '../../store/store';
import { Button, Input, Card, Alert, PageContainer, Checkbox } from '../../shared/components';
import * as faceapi from 'face-api.js'; // ✅ FIX: utiliser face-api.js directement (cohérent avec Register)
import axios from 'axios';

// ✅ FIX: URL centralisée et cohérente avec Register
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function Login() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceMode, setFaceMode] = useState(false);

  // 🔹 Charger les modèles face-api (même logique que Register)
  useEffect(() => {
    const initFace = async () => {
      try {
        const MODEL_URL = '/models';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
      } catch (err) {
        console.error('Erreur chargement modèles face:', err);
      }
    };
    initFace();
  }, []);

  // 🔹 Activer/désactiver caméra selon faceMode
  useEffect(() => {
    if (!faceMode) {
      stopCamera();
      return;
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
      }
    };

    startCamera();
    return () => stopCamera();
  }, [faceMode]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const redirectToSocial = (provider: 'google' | 'github') => {
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  // 🔐 Login classique
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await dispatch(
        login({ email, password, rememberMe })
      ).unwrap();

      if (res?.twoFactorRequired && res?.twoFactorToken) {
        setTwoFactorToken(res.twoFactorToken);
        return;
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Échec de la connexion');
    } finally {
      setLoading(false);
    }
  };

  // 🔐 Vérification 2FA
  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorToken) return;

    setError('');
    setLoading(true);

    try {
      await dispatch(
        verify2faLogin({
          twoFactorToken,
          code: twoFactorCode,
          rememberMe,
        })
      ).unwrap();

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Échec de la vérification 2FA');
    } finally {
      setLoading(false);
    }
  };

  // 🧠 Login facial — ✅ FIX: utilise face-api.js directement comme Register
  const handleFaceLogin = async () => {
    if (!videoRef.current) return;

    // ✅ FIX: vérifier que l'email est rempli (le backend en a besoin pour trouver l'utilisateur)
    if (!email) {
      setError("Veuillez entrer votre email avant d'utiliser la reconnaissance faciale.");
      return;
    }

    if (!modelsLoaded) {
      setError('Les modèles de reconnaissance ne sont pas encore chargés.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // ✅ FIX: même méthode de détection que Register pour cohérence
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setError('Aucun visage détecté. Assurez-vous d\'être bien face à la caméra.');
        return;
      }

      const embedding = Array.from(detection.descriptor);

      // ✅ FIX: URL cohérente avec Register
      const response = await axios.post(`${API_URL}/users/verify-face`, {
        email,
        embedding,
      });

      if (response.data.match) {
        stopCamera();
        navigate('/dashboard');
      } else {
        setError('Visage non reconnu. Essayez à nouveau ou utilisez votre mot de passe.');
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || 'Erreur lors du login facial';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer maxWidth="md" className="mt-8">
      <Card>
        <h2 className="text-2xl font-bold text-white mb-6">Connexion</h2>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        {/* ─── Formulaire classique ─── */}
        {!twoFactorToken && !faceMode && (
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <Checkbox
              label="Se souvenir de moi"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />

            <Button type="submit" fullWidth loading={loading}>
              Connexion
            </Button>

            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setFaceMode(true)}
            >
              Login avec reconnaissance faciale
            </Button>

            <div className="mt-4 text-sm text-gray-300">
              <Link className="text-blue-400 hover:underline" to="/forgot-password">
                Mot de passe oublié ?
              </Link>
            </div>
          </form>
        )}

        {/* ─── Mode reconnaissance faciale ─── */}
        {faceMode && (
          <div className="space-y-4">
            {/* ✅ FIX: l'email est demandé ICI aussi pour que le backend puisse identifier l'utilisateur */}
            <Input
              label="Email (nécessaire pour la reconnaissance faciale)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {!modelsLoaded && (
              <p className="text-gray-400 text-sm text-center">
                Chargement des modèles de reconnaissance...
              </p>
            )}

            {modelsLoaded && (
              <div className="text-center space-y-4">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  width={320}
                  height={240}
                  className="rounded-lg border border-gray-600 mx-auto"
                />

                <Button onClick={handleFaceLogin} fullWidth loading={loading}>
                  Vérifier mon visage
                </Button>
              </div>
            )}

            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => {
                setFaceMode(false);
                setError('');
              }}
            >
              Retour au login classique
            </Button>
          </div>
        )}

        {/* ─── Formulaire 2FA ─── */}
        {twoFactorToken && (
          <form onSubmit={handleVerify2fa} className="space-y-4">
            <p className="text-gray-300 text-sm">
              Entrez le code envoyé sur votre application d'authentification.
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
          </form>
        )}

        {/* ─── Social login ─── */}
        {!twoFactorToken && (
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
        )}
      </Card>
    </PageContainer>
  );
}

export default Login;