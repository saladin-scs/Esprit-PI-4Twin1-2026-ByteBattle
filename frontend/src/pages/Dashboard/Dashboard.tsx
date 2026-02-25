import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { PageContainer, Card } from '../../shared/components';

function Dashboard() {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <PageContainer maxWidth="7xl" className="py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Dashboard</h1>
      <Card>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Welcome, {user?.username}!
        </h2>
        <p className="text-gray-500 dark:text-gray-400">Your dashboard is under construction.</p>
      </Card>
    </PageContainer>
  );
}

export default Dashboard;
