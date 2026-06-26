import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { RealtimePriceProvider } from './context/RealtimePriceContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from './components/ui/sonner';

import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import Landing from './pages/Landing/Landing';
import Home from './pages/Home/Home';
import StockDetail from './pages/Stock/StockDetail';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <main className=''>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <BrowserRouter>
            <AuthProvider>
              <RealtimePriceProvider>
                <Navbar />
                <div className='lg:p-8 min-h-screen'>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />

                    {/* Protected Routes */}
                    <Route element={<ProtectedRoute />}>
                      <Route path="/dashboard" element={<Home />} />
                      <Route path="/stock/:symbol" element={<StockDetail />} />
                    </Route>
                  </Routes>
                </div>
                <Footer />
                <Toaster richColors closeButton position="bottom-right" />
              </RealtimePriceProvider>
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </main>
  );
}
