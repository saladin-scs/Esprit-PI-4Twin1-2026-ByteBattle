import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { PageContainer, Card, Button } from '../../shared/components';

function Home() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <PageContainer maxWidth="7xl" className="py-12">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
          ByteBattle
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          Plateforme de défis de code en temps réel. Compétez, apprenez et améliorez vos compétences grâce aux défis générés par l’IA.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          {isAuthenticated ? (
            <>
              <Link to="/challenges">
                <Button className="!px-8 !py-3 text-lg">Commencer à coder</Button>
              </Link>
              <Link to="/competitions">
                <Button variant="secondary" className="!px-8 !py-3 text-lg">Rejoindre une battle</Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/register">
                <Button className="!px-8 !py-3 text-lg">Créer un compte</Button>
              </Link>
              <Link to="/challenges">
                <Button variant="secondary" className="!px-8 !py-3 text-lg">Parcourir les défis</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card title="Batailles en temps réel">
          <p className="text-gray-500 dark:text-gray-400">
            Affrontez d’autres joueurs en 1v1 ou en équipe avec exécution de code en direct et classements en temps réel.
          </p>
        </Card>
        <Card title="Défis propulsés par l’IA">
          <p className="text-gray-500 dark:text-gray-400">
            Recevez des défis personnalisés générés par l’IA selon votre niveau et vos centres d’intérêt.
          </p>
        </Card>
        <Card title="Suivi de progression">
          <p className="text-gray-500 dark:text-gray-400">
            Suivez vos performances avec des statistiques détaillées, des succès et des parcours d’apprentissage.
          </p>
        </Card>
      </div>
    </PageContainer>
  );
}

export default Home;
