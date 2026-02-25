import { PageContainer, Card } from '../../shared/components';

function Competitions() {
  return (
    <PageContainer maxWidth="7xl" className="py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Compétitions</h1>
      <Card>
        <p className="text-gray-500 dark:text-gray-400">Les compétitions arrivent bientôt…</p>
      </Card>
    </PageContainer>
  );
}

export default Competitions;
