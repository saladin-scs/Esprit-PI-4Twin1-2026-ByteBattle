
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authApi } from '../../services/api';
import { Card, PageContainer, Spinner } from '../../shared/components';

function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await authApi.verifyEmail(token);
        setMessage('Email vérifié avec succès.');
      } catch (err: any) {
        setMessage(err?.response?.data?.message || err.message || 'Échec de vérification');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <PageContainer maxWidth="md" className="py-12">
      <Card>
        <h1 className="text-2xl font-bold text-white mb-4">Vérification email</h1>
        {loading ? (
          <div className="flex items-center gap-3 text-gray-300">
            <Spinner size="md" />
            <span>Vérification…</span>
          </div>
        ) : (
          <p className="text-gray-200">{message}</p>
        )}
      </Card>
    </PageContainer>
  );
}

export default VerifyEmail;
