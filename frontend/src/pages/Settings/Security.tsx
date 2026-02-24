import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authApi, usersApi } from '../../services/api';
import { AppDispatch, RootState } from '../../store/store';
import { fetchMe, logout } from '../../store/slices/authSlice';

function SecuritySettings() {
  const dispatch = useDispatch<AppDispatch>();
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
      setSuccess('Mot de passe changé.');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Erreur');
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
      setSuccess('Email de vérification renvoyé (si le compte existe).');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    try {
      await authApi.logout(refreshToken || undefined);
    } catch {
      // ignore
    } finally {
      dispatch(logout());
    }
  };

  const onRefreshProfile = async () => {
    await dispatch(fetchMe());
  };

  const onStart2faSetup = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await authApi.twofaSetup();
      setTwofaSetup({ qrDataUrl: res.data.qrDataUrl, backupCodes: res.data.backupCodes });
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Erreur');
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
      setSuccess('2FA activée.');
      setTwofaSetup(null);
      setTwofaCode('');
      await dispatch(fetchMe());
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Erreur');
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
      setSuccess('2FA désactivée.');
      setTwofaDisableCode('');
      setTwofaSetup(null);
      await dispatch(fetchMe());
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Sécurité</h1>

      <div className="space-y-8">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Vérification email</h2>
          <p className="text-gray-300 mb-4">
            Statut: {user?.emailVerifiedAt ? 'Vérifié' : 'Non vérifié'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="flex-1 px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={onResendVerification}
              disabled={loading}
              className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-4 py-2 rounded-md font-medium"
            >
              Renvoyer
            </button>
            <button
              onClick={onRefreshProfile}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-medium"
            >
              Rafraîchir
            </button>
          </div>
        </div>

        <form onSubmit={onChangePassword} className="bg-gray-800 p-6 rounded-lg space-y-4">
          <h2 className="text-xl font-semibold">Changer le mot de passe</h2>
          {error && <div className="bg-red-600 text-white p-3 rounded">{error}</div>}
          {success && <div className="bg-green-700 text-white p-3 rounded">{success}</div>}

          <div>
            <label className="block text-sm font-medium mb-2">Mot de passe actuel</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-4 py-2 rounded-md font-medium"
          >
            {loading ? 'En cours…' : 'Mettre à jour'}
          </button>
        </form>

        <div className="bg-gray-800 p-6 rounded-lg space-y-4">
          <h2 className="text-xl font-semibold">Authentification à deux facteurs</h2>
          <p className="text-gray-300">
            Statut: {user?.twoFactorEnabled ? 'Activée' : 'Désactivée'}
          </p>

          {!user?.twoFactorEnabled && !twofaSetup && (
            <button
              type="button"
              onClick={onStart2faSetup}
              disabled={loading}
              className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-4 py-2 rounded-md font-medium"
            >
              Démarrer la configuration 2FA
            </button>
          )}

          {twofaSetup && !user?.twoFactorEnabled && (
            <div className="space-y-4">
              <p className="text-gray-300">
                Scannez ce QR code avec Google Authenticator / Authy, puis entrez le code généré.
              </p>
              <img src={twofaSetup.qrDataUrl} alt="QR code 2FA" className="mx-auto" />

              <div>
                <h3 className="font-semibold mb-2">Codes de secours</h3>
                <p className="text-sm text-gray-400 mb-2">
                  Sauvegardez ces codes dans un endroit sûr. Chaque code ne peut être utilisé qu&apos;une seule fois.
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm font-mono bg-gray-900 p-3 rounded">
                  {twofaSetup.backupCodes.map((c) => (
                    <div key={c}>{c}</div>
                  ))}
                </div>
              </div>

              <form onSubmit={onEnable2fa} className="space-y-3">
                <label className="block text-sm font-medium mb-1">Code 2FA</label>
                <input
                  type="text"
                  value={twofaCode}
                  onChange={(e) => setTwofaCode(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-4 py-2 rounded-md font-medium"
                >
                  Activer 2FA
                </button>
              </form>
            </div>
          )}

          {user?.twoFactorEnabled && (
            <form onSubmit={onDisable2fa} className="space-y-3">
              <p className="text-gray-300">
                Pour désactiver 2FA, entrez un code valide (TOTP ou code de secours).
              </p>
              <label className="block text-sm font-medium mb-1">Code 2FA</label>
              <input
                type="text"
                value={twofaDisableCode}
                onChange={(e) => setTwofaDisableCode(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-4 py-2 rounded-md font-medium"
              >
                Désactiver 2FA
              </button>
            </form>
          )}
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Session</h2>
          <button
            onClick={onLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default SecuritySettings;

