import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Auth/Login';
import Home from './pages/Home/Home';
import { ThemeProvider } from './components/theme-provider';
import Signup from './pages/Auth/Signup';

export default function App() {
  return (
    <main className='p-4 lg:p-16'>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Home />} />
              </Route>

            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider></main>
  );
}
