import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/ClerkDashboard.css";

function ClerkDashboard() {
  const clerkId = localStorage.getItem("userId");
  const navigate = useNavigate();

  const [view,          setView]          = useState("cases");
  const [cases,         setCases]         = useState([]);
  const [caseNumber,    setCaseNumber]    = useState("");
  const [title,         setTitle]         = useState("");
  const [description,   setDescription]   = useState("");
  const [search,        setSearch]        = useState("");
  const [judges,        setJudges]        = useState([]);
  const [assignedJudge, setAssignedJudge] = useState("");
  const [selectedCase,  setSelectedCase]  = useState(null);
  const [evidenceList,  setEvidenceList]  = useState([]);
  const [evidenceRequests, setEvidenceRequests] = useState([]);
  const [evidenceDescriptions, setEvidenceDescriptions] = useState({});
  const [uploadingId,   setUploadingId]   = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  /* ── Fetch Cases ── */
  const fetchCases = useCallback(async () => {
    if (!clerkId) return;
    try {
      const res = await axios.get(`http://localhost:5000/api/cases/clerk/${clerkId}`);
      setCases(res.data);
    } catch (err) { console.error(err); }
  }, [clerkId]);

  /* ── Fetch Judges ── */
  const fetchJudges = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/users/judges");
      setJudges(res.data);
    } catch (err) { console.error(err); }
  }, []);

  /* ── Fetch Clerk Evidence Requests ── */
  const fetchEvidenceRequests = useCallback(async () => {
    if (!clerkId) return;
    try {
      const res = await axios.get(`http://localhost:5000/api/evidence/requests/clerk/${clerkId}`);
      setEvidenceRequests(res.data || []);
    } catch (err) {
      console.error(err);
      setEvidenceRequests([]);
    }
  }, [clerkId]);

  useEffect(() => {
    if (!clerkId) navigate("/");
    else { fetchCases(); fetchJudges(); fetchEvidenceRequests(); }
  }, [clerkId, navigate, fetchCases, fetchJudges, fetchEvidenceRequests]);

  /* ── Create Case ── */
  const createCase = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/cases/create", {
        caseNumber, title, description, createdBy: clerkId, assignedJudge,
      });
      alert("Case created");
      setCaseNumber(""); setTitle(""); setDescription(""); setAssignedJudge("");
      fetchCases();
      fetchEvidenceRequests();
      setView("cases");
    } catch { alert("Error creating case"); }
  };

  /* ── View Evidence ── */
  const viewEvidence = async (caseId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/evidence/case/${caseId}`);
      setEvidenceList(res.data);
      setSelectedCase(caseId);
    } catch { alert("Error fetching evidence"); }
  };

  /* ── Upload Evidence ── */
  const handleUpload = async (e, caseId) => {
    const file = e.target.files[0];
    if (!file) return;
    const evidenceDescription = (evidenceDescriptions[caseId] || "").trim();

    if (!evidenceDescription) {
      alert("Please add evidence description before upload.");
      e.target.value = null;
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("caseId", caseId);
    formData.append("uploadedBy", clerkId);
    formData.append("description", evidenceDescription);
    try {
      setUploadingId(caseId);
      await axios.post("http://localhost:5000/api/evidence/upload", formData);
      alert("Evidence request submitted. Awaiting judge approval.");
      setEvidenceDescriptions((prev) => ({ ...prev, [caseId]: "" }));
      fetchEvidenceRequests();
      if (selectedCase === caseId) viewEvidence(caseId);
    } catch (error) {
      alert(error.response?.data?.error || "Evidence request failed");
    }
    finally { setUploadingId(null); e.target.value = null; }
  };

  /* ── Search Filter ── */
  const filteredCases = cases.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.caseNumber.toLowerCase().includes(search.toLowerCase())
  );

  /* ── Status pill helper ── */
  const StatusPill = ({ status }) => (
    <span className={`status-pill ${status}`}>{status}</span>
  );

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert("New password and confirm password do not match.");
      return;
    }

    try {
      setPasswordLoading(true);
      await axios.put(
        "http://localhost:5000/api/auth/change-password",
        { currentPassword, newPassword },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      alert("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setView("cases");
    } catch (error) {
      alert(error.response?.data?.message || "Could not update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">

      {/* ── SIDEBAR ── */}
      <aside className="sidebar">

        {/* Logo */}
        <div className="sidebar-logo">LegalChain</div>

        {/* Nav buttons */}
        <button
          className={view === "cases" ? "active" : ""}
          onClick={() => setView("cases")}
        >
          All Cases
        </button>

        <button
          className={view === "create" ? "active" : ""}
          onClick={() => setView("create")}
        >
          Create Case
        </button>

        <button
          className={view === "requests" ? "active" : ""}
          onClick={() => setView("requests")}
        >
          Evidence Requests
        </button>

        <button
          className={view === "password" ? "active" : ""}
          onClick={() => setView("password")}
        >
          Change Password
        </button>

      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="main-content">

        {/* ── TOPBAR ── */}
        <header className="topbar">
          <h1>Clerk Dashboard</h1>
          <button
  className="logout-btn"
  onClick={() => {
    localStorage.clear();
    navigate("/");
  }}
>

  <span>Logout</span>
  <svg 
    width="14" 
    height="14" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
  
</button>
        </header>

        {/* ── PAGE BODY ── */}
        <main className="page-body">

          {/* ════ CREATE CASE VIEW ════ */}
          {view === "create" && (
            <form onSubmit={createCase}>

              {/* Row 1 — Case Number + Title */}
              <div className="form-row">
                <input
                  placeholder="Case Number"
                  value={caseNumber}
                  onChange={e => setCaseNumber(e.target.value)}
                  required
                />
                <input
                  placeholder="Title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Row 2 — Judge selector (full width) */}
              <select
                value={assignedJudge}
                onChange={e => setAssignedJudge(e.target.value)}
                required
              >
                <option value="">Assign Judge</option>
                {judges.map(j => (
                  <option key={j._id} value={j._id}>{j.name}</option>
                ))}
              </select>

              {/* Row 3 — Description (full width) */}
              <textarea
                placeholder="Case Description"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />

              <button type="submit">File Case</button>

            </form>
          )}

          {/* ════ CASES LIST VIEW ════ */}
          {view === "cases" && (
            <>
              {/* Search */}
              <input
                className="search-input"
                placeholder="Search by case number or title…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />

              {/* Table card */}
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Case No.</th>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Evidence Request</th>
                      <th>Files</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.length === 0 ? (
                      <tr>
                        <td colSpan="5">No cases found.</td>
                      </tr>
                    ) : (
                      filteredCases.map(c => (
                        <tr key={c._id}>

                          {/* Case number */}
                          <td>{c.caseNumber}</td>

                          {/* Title */}
                          <td>{c.title}</td>

                          {/* Status */}
                          <td>
                            <StatusPill status={c.status} />
                          </td>

                          {/* Upload */}
                          <td>
                            {c.status === "approved" ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                {uploadingId === c._id && <span className="uploading-tag">Submitting...</span>}
                                <textarea
                                  className="evidence-note-input"
                                  placeholder="Add evidence description for judge review"
                                  value={evidenceDescriptions[c._id] || ""}
                                  onChange={(evt) => setEvidenceDescriptions((prev) => ({
                                    ...prev,
                                    [c._id]: evt.target.value
                                  }))}
                                  disabled={uploadingId === c._id}
                                />
                                <input
                                  type="file"
                                  disabled={uploadingId === c._id}
                                  onChange={e => handleUpload(e, c._id)}
                                />
                              </div>
                            ) : (
                              <span className="upload-waiting">Awaiting judge approval</span>
                            )}
                          </td>

                          {/* View evidence */}
                          <td>
                            <button
                              className="btn-table"
                              onClick={() => viewEvidence(c._id)}
                            >
                              View Files
                            </button>
                          </td>

                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Evidence Panel ── */}
              {selectedCase && (
                <div className="evidence-panel">

                  <h3>
                    Evidence Chain — {cases.find(c => c._id === selectedCase)?.caseNumber}
                  </h3>

                  {evidenceList.length === 0 ? (
                    <p>No evidence uploaded yet.</p>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>File Name</th>
                          <th>SHA-256 Hash</th>
                          <th>IPFS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evidenceList.map(e => (
                          <tr key={e._id}>
                            <td>{e.fileName}</td>
                            <td style={{ fontSize: "12px" }}>{e.fileHash}</td>
                            <td>
                              <a
                                href={`https://gateway.pinata.cloud/ipfs/${e.ipfsHash}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open File
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <button
                    onClick={() => { setSelectedCase(null); setEvidenceList([]); }}
                  >
                    Close
                  </button>

                </div>
              )}

            </>
          )}

          {/* ════ EVIDENCE REQUESTS VIEW ════ */}
          {view === "requests" && (
            <>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Case No.</th>
                      <th>Case Title</th>
                      <th>File</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Submitted At</th>
                      <th>Blockchain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidenceRequests.length === 0 ? (
                      <tr>
                        <td colSpan="7">No evidence requests submitted yet.</td>
                      </tr>
                    ) : (
                      evidenceRequests.map((reqItem) => (
                        <tr key={reqItem._id}>
                          <td>{reqItem.caseDetails?.caseNumber || "N/A"}</td>
                          <td>{reqItem.caseDetails?.title || "N/A"}</td>
                          <td>{reqItem.fileName}</td>
                          <td>{reqItem.description || "No description"}</td>
                          <td>
                            <span className={`status-pill ${reqItem.status}`}>
                              {reqItem.status}
                            </span>
                          </td>
                          <td>{new Date(reqItem.uploadedAt).toLocaleString()}</td>
                          <td>
                            {reqItem.status === "approved" && reqItem.ipfsHash ? (
                              <a
                                href={`https://gateway.pinata.cloud/ipfs/${reqItem.ipfsHash}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                View
                              </a>
                            ) : reqItem.status === "rejected" ? (
                              <span>{reqItem.rejectionReason || "Rejected"}</span>
                            ) : (
                              <span className="upload-waiting">Awaiting Judge Approval</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {view === "password" && (
            <div className="password-card">
              <h2>Update Your Password</h2>
              <p className="password-help">
                Password must include at least one number and one special character.
              </p>
              <form className="password-form" onSubmit={handlePasswordUpdate}>
                <input
                  type="password"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button type="submit" disabled={passwordLoading}>
                  {passwordLoading ? "Updating..." : "Update Password"}
                </button>
              </form>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

export default ClerkDashboard;