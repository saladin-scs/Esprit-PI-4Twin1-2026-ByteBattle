import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authApi } from '../../services/api';

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
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-gray-800 p-6 rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Vérification email</h1>
        <p className="text-gray-200">{loading ? 'Vérification…' : message}</p>
      </div>
    </div>
  );
}

export default VerifyEmail;

