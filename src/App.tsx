import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import Home from './pages/Home';
import JoinGame from './pages/JoinGame';
import CreateGame from './pages/CreateGame';
import Game from './pages/GamePage';
import { Toaster } from './components/ui/sonner';
import { ErrorBoundary, useErrorHandler } from './components/ErrorBoundary';
import { clearAllExpiredSessions } from './lib/sessionManager';
import { useEffect } from 'react';
import { TooltipProvider } from './components/ui/tooltip';

function AppContext() {
  useErrorHandler();

  useEffect(() => {
    clearAllExpiredSessions();
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateGame />} />
        <Route path="/join" element={<JoinGame />} />
        <Route path="/game/:gameId" element={<Game />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <BrowserRouter>
            <AppContext />
          </BrowserRouter>
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
