import { Toaster } from 'react-hot-toast';
import { AppRoutes } from './core/routes';
import { TooltipProvider } from './shared/components/ui/Tooltip';

function App() {
  return (
    <TooltipProvider>
      <AppRoutes />
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    </TooltipProvider>
  );
}

export default App;

