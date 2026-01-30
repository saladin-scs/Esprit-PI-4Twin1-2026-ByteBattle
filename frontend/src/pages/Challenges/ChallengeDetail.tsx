import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchChallenge } from '../../store/slices/challengesSlice';
import { AppDispatch, RootState } from '../../store/store';
import Editor from '@monaco-editor/react';
import { codeExecutionApi } from '../../services/api';

function ChallengeDetail() {
  const { id } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const { currentChallenge } = useSelector(
    (state: RootState) => state.challenges
  );
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchChallenge(id));
    }
  }, [id, dispatch]);

  const handleRun = async () => {
    if (!currentChallenge) return;
    setLoading(true);
    try {
      const response = await codeExecutionApi.execute({
        code,
        language,
        testCases: currentChallenge.testCases,
      });
      setResults(response.data);
    } catch (error) {
      console.error('Execution error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentChallenge) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h1 className="text-3xl font-bold mb-4">{currentChallenge.title}</h1>
          <div className="bg-gray-800 p-6 rounded-lg mb-6">
            <p className="text-gray-300 whitespace-pre-wrap">
              {currentChallenge.description}
            </p>
          </div>
        </div>
        <div>
          <div className="mb-4">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg mb-4"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
          </div>
          <div className="bg-gray-800 rounded-lg overflow-hidden mb-4">
            <Editor
              height="400px"
              language={language}
              value={code || currentChallenge.starterCode}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
            />
          </div>
          <button
            onClick={handleRun}
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run Code'}
          </button>
          {results && (
            <div className="mt-4 bg-gray-800 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Results</h3>
              <pre className="text-sm">{JSON.stringify(results, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChallengeDetail;

