import { Toaster } from 'react-hot-toast';
import { AppRoutes } from './core/routes';
import { PopupProvider } from './contexts/PopupContext';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <PopupProvider>
        <AppRoutes />
      </PopupProvider>
      <Toaster
        position="top-center"
        containerStyle={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        toastOptions={{ duration: 4000 }}
      />
    </ErrorBoundary>
  );
}

export default App;

