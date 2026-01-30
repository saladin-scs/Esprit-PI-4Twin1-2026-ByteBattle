import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

function Dashboard() {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Welcome, {user?.username}!</h2>
        <p className="text-gray-400">Your dashboard is under construction.</p>
      </div>
    </div>
  );
}

export default Dashboard;

