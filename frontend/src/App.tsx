import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import ProtectedRoute from "./components/protectedRoute";
import Auth from "./pages/Auth/Login";
import Home from "./pages/Home/Home";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
            path="/auth/login"
            element={<Auth/>}
        />

        {/* Protected Route */}
        <Route
            path="/"
            element={
                <ProtectedRoute>
                    <Home />
                </ProtectedRoute>
            }
        />
      </Routes>
    </BrowserRouter>
    );
}

export default App
