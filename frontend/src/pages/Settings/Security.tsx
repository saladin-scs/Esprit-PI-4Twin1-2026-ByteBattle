import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authApi, usersApi } from '../../services/api';
import { AppDispatch, RootState } from '../../store/store';
import { fetchMe, logout } from '../../store/slices/authSlice';
import { Button, Input, Card, Alert, PageContainer } from '../../shared/components';

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
    <PageContainer maxWidth="2xl" className="py-12">
      <h1 className="text-3xl font-bold text-white mb-8">Sécurité</h1>

      <div className="space-y-8">
        {(error || success) && (
          <>
            {error && <Alert variant="error">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}
          </>
        )}

        <Card title="Vérification email">
          <p className="text-gray-300 mb-4">
            Statut: {user?.emailVerifiedAt ? 'Vérifié' : 'Non vérifié'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="flex-1"
            />
            <Button onClick={onResendVerification} disabled={loading} loading={loading}>
              Renvoyer
            </Button>
            <Button variant="secondary" onClick={() => dispatch(fetchMe())}>
              Rafraîchir
            </Button>
          </div>
        </Card>

        <Card title="Changer le mot de passe">
          <form onSubmit={onChangePassword} className="space-y-4">
            <Input
              label="Mot de passe actuel"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="Nouveau mot de passe"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
            <Button type="submit" disabled={loading} loading={loading}>
              Mettre à jour
            </Button>
          </form>
        </Card>

        <Card title="Authentification à deux facteurs">
          <p className="text-gray-300 mb-4">
            Statut: {user?.twoFactorEnabled ? 'Activée' : 'Désactivée'}
          </p>

          {!user?.twoFactorEnabled && !twofaSetup && (
            <Button onClick={onStart2faSetup} disabled={loading} loading={loading}>
              Démarrer la configuration 2FA
            </Button>
          )}

          {twofaSetup && !user?.twoFactorEnabled && (
            <div className="space-y-4">
              <p className="text-gray-300">
                Scannez ce QR code avec Google Authenticator / Authy, puis entrez le code généré.
              </p>
              <img src={twofaSetup.qrDataUrl} alt="QR code 2FA" className="mx-auto" />
              <div>
                <h3 className="font-semibold text-gray-300 mb-2">Codes de secours</h3>
                <p className="text-sm text-gray-400 mb-2">
                  Sauvegardez ces codes dans un endroit sûr. Chaque code ne peut être utilisé qu&apos;une seule fois.
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm font-mono bg-gray-900 p-3 rounded text-gray-300">
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
                  Activer 2FA
                </Button>
              </form>
            </div>
          )}

          {user?.twoFactorEnabled && (
            <form onSubmit={onDisable2fa} className="space-y-3">
              <p className="text-gray-300">
                Pour désactiver 2FA, entrez un code valide (TOTP ou code de secours).
              </p>
              <Input
                label="Code 2FA"
                type="text"
                value={twofaDisableCode}
                onChange={(e) => setTwofaDisableCode(e.target.value)}
                required
              />
              <Button type="submit" variant="danger" disabled={loading} loading={loading}>
                Désactiver 2FA
              </Button>
            </form>
          )}
        </Card>

        <Card title="Session">
          <Button variant="danger" onClick={onLogout}>
            Déconnexion
          </Button>
        </Card>
      </div>
    </PageContainer>
  );
}

export default SecuritySettings;
