import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css"; // Import the CSS file for styling

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const res = await axios.post("http://localhost:5000/api/auth/login", { email, password });
    
    // Destructure the response
    const { token, role, userId } = res.data;

    // Store data in localStorage for the ProtectedRoute and Axios headers
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    localStorage.setItem("userId", userId);

    // ADDED: Handle the Super Admin redirect
    if (role === "admin") {
      navigate("/admin-dashboard");
    } 
    else if (role === "clerk") {
      navigate("/clerk");
    } 
    else if (role === "judge") {
      navigate("/judge");
    }
    
  } catch (error) {
    // Better error feedback
    const message = error.response?.data?.message || "Invalid email or password";
    alert(message);
  }
};

  return (
    <div className="login-card">

      <div className="login-header">
        <p className="login-eyebrow">⚖ Court of Record</p>
       
        <p className="login-sub">Authorised personnel only</p>
      </div>

      <form className="login-form" onSubmit={handleLogin}>

        <div className="form-field">
          <label className="form-label" htmlFor="email">Email Address</label>
          <input
            id="email"
            className="form-input"
            type="email"
            placeholder="you@court.gov"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="password">Password</label>
          <input
            id="password"
            className="form-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button className="login-btn" type="submit">
          Sign In
        </button>

      </form>

      

    </div>
  );
}

export default Login;