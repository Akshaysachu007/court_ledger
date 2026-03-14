import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./dashboards/AdminDashboard"; // Keep only for initial admin setup
import AdminDashboard from "./dashboards/AdminDashboard";
import ClerkDashboard from "./dashboards/ClerkDashboard";
import JudgeDashboard from "./dashboards/JudgeDashboard";

// Simple ProtectedRoute Component
const ProtectedRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    // Redirect to their own dashboard if they try to access the wrong one
    return <Navigate to={`/${role}`} replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        
        {/* NOTE: You might want to remove /register once you 
           have created your first Admin to keep the app secure.
        */}
        <Route path="/register" element={<Register />} />

        {/* Admin Route - Only accessible by admins */}
        <Route 
          path="/admin-dashboard" 
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Clerk Route - Only accessible by clerks */}
        <Route 
          path="/clerk" 
          element={
            <ProtectedRoute allowedRole="clerk">
              <ClerkDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Judge Route - Only accessible by judges */}
        <Route 
          path="/judge" 
          element={
            <ProtectedRoute allowedRole="judge">
              <JudgeDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;