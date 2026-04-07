import { Toaster } from 'react-hot-toast';
import { AppRoutes } from './core/routes';
import { PopupProvider } from './contexts/PopupContext';

function App() {
  return (
    <>
      <PopupProvider>
        <AppRoutes />
      </PopupProvider>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    </>
  );
}

export default App;

