import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ThemeProvider } from './components/theme-provider';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import Landing from './pages/Landing/Landing';
import Home from './pages/Home/Home';
import Navbar from './components/Navbar';

export default function App() {
  return (
    <main className=''>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <BrowserRouter>
          <AuthProvider>
            <Navbar />
            <div className='lg:p-16'>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<Home />} />
                </Route>
              </Routes>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider></main>
  );
}
