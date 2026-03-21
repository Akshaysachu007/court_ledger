import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/Register.css"; 

function AdminDashboard() {
  const strongPasswordRegex = /^(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

  // Data States
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Registration / Edit Form State
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "clerk" });
  const [editingUserId, setEditingUserId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/auth/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (error) {
      console.error("Failed to fetch users");
      if (error.response?.status === 401) navigate("/");
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!token) navigate("/");
    else fetchUsers();
  }, [token, navigate, fetchUsers]);

  // Form Submission (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password && !strongPasswordRegex.test(formData.password)) {
      alert("Password must contain at least one number and one special character.");
      return;
    }

    try {
      if (editingUserId) {
        await axios.put(`http://localhost:5000/api/auth/users/${editingUserId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert("Official credentials updated.");
      } else {
        await axios.post("http://localhost:5000/api/auth/create-user", formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert("New official registered.");
      }
      closeModal();
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || "Action failed");
    }
  };

  // Delete User
  const deleteUser = async (id) => {
    if (!window.confirm("Permanently revoke access for this official?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/auth/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers();
    } catch (error) {
      alert("Revocation failed.");
    }
  };

  // UI Helper Functions
  const startEdit = (user) => {
    setEditingUserId(user._id);
    setFormData({ name: user.name, email: user.email, password: "", role: user.role });
    setShowForm(true);
  };

  const closeModal = () => {
    setShowForm(false);
    setEditingUserId(null);
    setFormData({ name: "", email: "", password: "", role: "clerk" });
  };

  // Search Logic (Case-insensitive)
  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-text">LEGALCHAIN</span>
        </div>
        <div className="sidebar-nav-section">
          <p className="sidebar-nav-label">Administration</p>
          <button className="nav-btn active">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Staff Directory
          </button>
        </div>
        <div className="sidebar-footer">Institutional Access</div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="main-content">
        <header className="topbar">
          <h1>Identity & Access Control</h1>
          <button className="logout-btn" onClick={() => { localStorage.clear(); navigate("/"); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Logout</span>
          </button>
        </header>

        <main className="page-body">
          <div className="page-heading">
            <div>
              <h2 className="page-heading-title">Staff Directory</h2>
              <p className="page-heading-sub">Authenticating judicial members on the ledger</p>
            </div>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              Register New Official
            </button>
          </div>

          {/* SEARCH BOX */}
          <div className="search-container">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              className="search-input"
              placeholder="Filter by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="loader">Decrypting Directory...</div>
          ) : (
            <div className="table-wrapper">
              <div className="table-wrapper-header">
                <span className="table-wrapper-title">Registry ({filteredUsers.length})</span>
              </div>
              <table className="luxury-table">
                <thead>
                  <tr>
                    <th>Official Name</th>
                    <th>Registry Email</th>
                    <th>Role</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <tr key={user._id}>
                        <td className="case-id-cell">{user.name}</td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`status-pill ${user.role}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="text-right">
                          <button className="btn-table" onClick={() => startEdit(user)}>Edit</button>
                          <button 
                            className="btn-table" 
                            style={{ marginLeft: '8px', color: 'var(--red)' }} 
                            onClick={() => deleteUser(user._id)}
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="empty-row">No records match your query.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* REGISTRATION & EDITING MODAL */}
          {showForm && (
            <div className="glass-modal-overlay">
              <div className="glass-panel" style={{ maxWidth: '480px' }}>
                <div className="panel-header">
                  <h2>{editingUserId ? "Modify Official" : "Register Official"}</h2>
                  <button className="close-panel" onClick={closeModal}>&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className="register-form" style={{ boxShadow: 'none', padding: '0' }}>
                  <div className="form-field">
                    <label className="form-label">Full Legal Name</label>
                    <input 
                      className="form-input"
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Email Address</label>
                    <input 
                      className="form-input"
                      type="email" 
                      value={formData.email} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Access Key {editingUserId && "(Leave blank to keep current)"}</label>
                    <input 
                      className="form-input"
                      type="password" 
                      value={formData.password} 
                      onChange={(e) => setFormData({...formData, password: e.target.value})} 
                      required={!editingUserId} 
                    />
                    <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '6px' }}>
                      Must include at least one number and one special character.
                    </small>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Assigned Designation</label>
                    <select className="form-select" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                      <option value="clerk">Judicial Clerk</option>
                      <option value="judge">Presiding Judge</option>
                    </select>
                  </div>
                  <div className="form-actions" style={{ border: 'none', marginTop: '24px' }}>
                    <button type="submit" className="btn-primary">
                      {editingUserId ? "Update Credentials" : "Issue Access"}
                    </button>
                    <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;