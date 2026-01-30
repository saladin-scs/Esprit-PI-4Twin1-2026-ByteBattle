import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchChallenges } from '../../store/slices/challengesSlice';
import { AppDispatch, RootState } from '../../store/store';

function Challenges() {
  const dispatch = useDispatch<AppDispatch>();
  const { challenges, loading } = useSelector(
    (state: RootState) => state.challenges
  );

  useEffect(() => {
    dispatch(fetchChallenges());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">Loading challenges...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Challenges</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {challenges.map((challenge) => (
          <Link
            key={challenge._id}
            to={`/challenges/${challenge._id}`}
            className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition"
          >
            <h3 className="text-xl font-semibold mb-2">{challenge.title}</h3>
            <p className="text-gray-400 mb-4 line-clamp-2">
              {challenge.description}
            </p>
            <div className="flex items-center justify-between">
              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  challenge.difficulty === 'easy'
                    ? 'bg-green-600'
                    : challenge.difficulty === 'medium'
                    ? 'bg-yellow-600'
                    : 'bg-red-600'
                }`}
              >
                {challenge.difficulty}
              </span>
              <span className="text-gray-400 text-sm">
                {challenge.solvedCount} solved
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Challenges;

