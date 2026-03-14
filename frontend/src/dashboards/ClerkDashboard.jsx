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
  const [uploadingId,   setUploadingId]   = useState(null);

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

  useEffect(() => {
    if (!clerkId) navigate("/");
    else { fetchCases(); fetchJudges(); }
  }, [clerkId, navigate, fetchCases, fetchJudges]);

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
    const formData = new FormData();
    formData.append("file", file);
    formData.append("caseId", caseId);
    formData.append("uploadedBy", clerkId);
    try {
      setUploadingId(caseId);
      await axios.post("http://localhost:5000/api/evidence/upload", formData);
      alert("Evidence uploaded successfully");
      if (selectedCase === caseId) viewEvidence(caseId);
    } catch { alert("Upload failed"); }
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
                      <th>Evidence Upload</th>
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
                                {uploadingId === c._id && (
                                  <span className="uploading-tag">Uploading…</span>
                                )}
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

        </main>
      </div>
    </div>
  );
}

export default ClerkDashboard;