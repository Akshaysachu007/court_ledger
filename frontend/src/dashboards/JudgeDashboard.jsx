import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
// Ensure all these are used below to avoid "never read" warnings
import { 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  Clock, 
  Database,
  ExternalLink,
  LogOut,
  Inbox,
  Activity,
  KeyRound
} from "lucide-react";
import "../styles/JudgeDashboard.css";

function JudgeDashboard() {
  const judgeId = localStorage.getItem("userId");
  const navigate = useNavigate();

  // Data States
  const [cases, setCases] = useState([]);
  const [pendingEvidenceRequests, setPendingEvidenceRequests] = useState([]);
  const [caseIntegrity, setCaseIntegrity] = useState({});
  const [tamperedEvidence, setTamperedEvidence] = useState([]);
  const [evidenceMap, setEvidenceMap] = useState({});
  const [blockchainDetails, setBlockchainDetails] = useState({});
  const [selectedEvidenceRequest, setSelectedEvidenceRequest] = useState(null);
  const [requestCaseEvidence, setRequestCaseEvidence] = useState([]);

  // UI States
  const [activeTab, setActiveTab] = useState("new-evidence");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCase, setSelectedCase] = useState(null);
  const [updatingCaseId, setUpdatingCaseId] = useState(null);
  const [updatingEvidenceId, setUpdatingEvidenceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const isPendingCase = (caseItem) => {
    if (!caseItem) return false;
    return caseItem.status === "pending_review" || caseItem.status === "pending";
  };

  const isResolvedCase = (caseItem) => {
    if (!caseItem) return false;
    return caseItem.status === "approved" || caseItem.status === "rejected";
  };

  const fetchAssignedCases = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5000/api/cases/judge/${judgeId}`);
      const casesData = res.data;
      setCases(casesData);

      let integrityMap = {};
      let tamperedList = [];
      let fullEvidenceMap = {};
      let fullBCDetails = {};

      for (const c of casesData) {
        const evRes = await axios.get(`http://localhost:5000/api/evidence/case/${c._id}`);
        const evidence = evRes.data;
        fullEvidenceMap[c._id] = evidence;

        if (evidence.length === 0) {
          integrityMap[c._id] = { status: "no-evidence", files: {} };
          continue;
        }

        try {
          const verifyRes = await axios.get(`http://localhost:5000/api/evidence/verify/${c._id}`);
          const blockchainTimeline = verifyRes.data; 
          fullBCDetails[c._id] = blockchainTimeline;

          let caseTampered = false;
          let fileResults = {};

          evidence.forEach((localFile) => {
            const onChainRecord = blockchainTimeline.find(bc => bc.fileHash === localFile.fileHash);
            const isMatch = onChainRecord && onChainRecord.cid === localFile.ipfsHash;
            fileResults[localFile._id] = isMatch ? "verified" : "tampered";

            if (!isMatch) {
              caseTampered = true;
              tamperedList.push({ ...localFile, caseNumber: c.caseNumber });
            }
          });

          integrityMap[c._id] = {
            status: caseTampered ? "tampered" : "verified",
            timestamp: blockchainTimeline[0]?.timestamp,
            txHash: blockchainTimeline[0]?.blockchainTx,
            blockNumber: blockchainTimeline[0]?.blockNumber,
            files: fileResults
          };
        } catch (err) {
          integrityMap[c._id] = { status: "tampered", files: {} };
        }
      }

      setCaseIntegrity(integrityMap);
      setTamperedEvidence(tamperedList);
      setEvidenceMap(fullEvidenceMap);
      setBlockchainDetails(fullBCDetails);
    } catch (error) {
      console.error("Dashboard load error:", error);
    } finally {
      setLoading(false);
    }
  }, [judgeId]);

  const fetchPendingEvidenceRequests = useCallback(async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/evidence/pending/judge/${judgeId}`);
      setPendingEvidenceRequests(res.data || []);
    } catch (error) {
      console.error("Pending evidence load error:", error);
      setPendingEvidenceRequests([]);
    }
  }, [judgeId]);

  useEffect(() => {
    if (!judgeId) navigate("/");
    else {
      fetchAssignedCases();
      fetchPendingEvidenceRequests();
    }
  }, [judgeId, navigate, fetchAssignedCases, fetchPendingEvidenceRequests]);

  const updateCaseStatus = async (caseId, status) => {
    try {
      setUpdatingCaseId(caseId);
      const endpoint = status === "approved" ? "approve" : "reject";
      await axios.put(`http://localhost:5000/api/cases/${endpoint}/${caseId}`, { judgeId });
      await fetchAssignedCases();
      setSelectedCase(null);
    } catch (error) {
      alert("Error updating case");
    } finally {
      setUpdatingCaseId(null);
    }
  };

  const loadCaseEvidenceDetails = async (caseId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/evidence/case/${caseId}?includeAll=true`);
      setRequestCaseEvidence(res.data || []);
    } catch (error) {
      console.error("Case evidence details load error:", error);
      setRequestCaseEvidence([]);
    }
  };

  const openEvidenceRequest = async (requestItem) => {
    setSelectedEvidenceRequest(requestItem);
    setSelectedCase(null);
    await loadCaseEvidenceDetails(requestItem.caseId);
  };

  const updateEvidenceRequestStatus = async (evidenceId, status) => {
    try {
      setUpdatingEvidenceId(evidenceId);
      const endpoint = status === "approved" ? "approve" : "reject";
      await axios.put(`http://localhost:5000/api/evidence/${endpoint}/${evidenceId}`, {
        judgeId,
        reason: status === "rejected" ? "Rejected by judge" : undefined
      });

      await fetchPendingEvidenceRequests();
      await fetchAssignedCases();
      setSelectedEvidenceRequest(null);
      setRequestCaseEvidence([]);
    } catch (error) {
      alert(error.response?.data?.error || "Error updating evidence request");
    } finally {
      setUpdatingEvidenceId(null);
    }
  };

  const getPendingPreviewUrl = (evidenceId) => {
    return `http://localhost:5000/api/evidence/preview/${evidenceId}?judgeId=${judgeId}`;
  };

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
      setActiveTab("all");
    } catch (error) {
      alert(error.response?.data?.message || "Could not update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    const matchesSearch = 
      c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "new") return matchesSearch && isPendingCase(c);
    if (activeTab === "all") return matchesSearch && isResolvedCase(c);
    if (activeTab === "tampered") return matchesSearch && caseIntegrity[c._id]?.status === "tampered";
    return matchesSearch;
  });

  const filteredEvidenceRequests = pendingEvidenceRequests.filter((item) => {
    const caseDetails = item.caseDetails || {};
    const matchesSearch =
      (caseDetails.caseNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (caseDetails.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.fileName || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">LegalChain</div>
        <nav>
          <button className={`nav-btn ${activeTab === "new-evidence" ? "active" : ""}`} onClick={() => setActiveTab("new-evidence")}>
            <Inbox size={18} /> New Evidence
            {pendingEvidenceRequests.length > 0 && <span className="alert-badge">{pendingEvidenceRequests.length}</span>}
          </button>
          <button className={`nav-btn ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>
            <Database size={18} /> All Cases
          </button>
          <button className={`nav-btn ${activeTab === "new" ? "active" : ""}`} onClick={() => setActiveTab("new")}>
            <Inbox size={18} /> New Requests
          </button>
          <button className={`nav-btn ${activeTab === "tampered" ? "active" : ""}`} onClick={() => setActiveTab("tampered")}>
            <div className="nav-btn-content" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <AlertTriangle size={18} /> 
              <span style={{ marginLeft: '10px' }}>Tampered Alerts</span>
              {tamperedEvidence.length > 0 && <span className="alert-badge">{tamperedEvidence.length}</span>}
            </div>
          </button>
          <button className={`nav-btn ${activeTab === "password" ? "active" : ""}`} onClick={() => setActiveTab("password")}>
            <KeyRound size={18} /> Change Password
          </button>
        </nav>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div className="header-title">
            <h1>Judge Portal</h1>
            <span className="breadcrumb">System / {activeTab.toUpperCase()}</span>
          </div>
          
          <div className="search-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Search Case ID or Title..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-bar"
            />
          </div>

          <button className="logout-btn" onClick={() => { localStorage.clear(); navigate("/"); }}>
            <LogOut size={18} /> Logout
          </button>
        </header>

        <main className="page-body">
          {loading ? (
            <div className="loading-state">Synchronizing with Blockchain...</div>
          ) : (
            <>
              {activeTab === "password" ? (
                <div className="password-card animate-fade">
                  <h3>Update Your Password</h3>
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
                    <button type="submit" className="approve-btn" disabled={passwordLoading}>
                      {passwordLoading ? "Updating..." : "Update Password"}
                    </button>
                  </form>
                </div>
              ) : activeTab === "new-evidence" ? (
                <div className="table-wrapper animate-fade">
                  <table className="cases-table">
                    <thead>
                      <tr>
                        <th>Case ID</th>
                        <th>Case Title</th>
                        <th>Evidence File</th>
                        <th>Requested At</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvidenceRequests.length === 0 ? (
                        <tr>
                          <td colSpan="5">No pending evidence requests.</td>
                        </tr>
                      ) : (
                        filteredEvidenceRequests.map((item) => (
                          <tr key={item._id}>
                            <td className="case-number">{item.caseDetails?.caseNumber || "N/A"}</td>
                            <td>{item.caseDetails?.title || "N/A"}</td>
                            <td>{item.fileName}</td>
                            <td>{new Date(item.uploadedAt).toLocaleString()}</td>
                            <td>
                              <button className="view-btn" onClick={() => openEvidenceRequest(item)}>
                                Review Evidence
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="table-wrapper animate-fade">
                  <table className="cases-table">
                    <thead>
                      <tr>
                        <th>Case ID</th>
                        <th>Subject</th>
                        <th>Status</th>
                        <th>Integrity</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCases.length === 0 ? (
                        <tr>
                          <td colSpan="5">No cases available in this section.</td>
                        </tr>
                      ) : (
                        filteredCases.map((c) => (
                          <tr key={c._id}>
                            <td className="case-number">{c.caseNumber}</td>
                            <td>{c.title}</td>
                            <td><span className={`status-badge ${c.status}`}>{c.status}</span></td>
                            <td>
                              <span
                                className={
                                  caseIntegrity[c._id]?.status === "verified"
                                    ? "status-valid"
                                    : caseIntegrity[c._id]?.status === "no-evidence"
                                      ? "status-no-evidence"
                                      : "status-tampered"
                                }
                              >
                                {caseIntegrity[c._id]?.status === "verified" ? (
                                  <ShieldCheck size={14} />
                                ) : caseIntegrity[c._id]?.status === "no-evidence" ? (
                                  <FileText size={14} />
                                ) : (
                                  <AlertTriangle size={14} />
                                )}
                                {caseIntegrity[c._id]?.status === "verified"
                                  ? " Verified"
                                  : caseIntegrity[c._id]?.status === "no-evidence"
                                    ? " No Evidence Available"
                                    : " Tampered"}
                              </span>
                            </td>
                            <td>
                              <button className="view-btn" onClick={() => { setSelectedEvidenceRequest(null); setSelectedCase(c); }}>
                                {isPendingCase(c) ? "View Details" : "View Case"}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {selectedEvidenceRequest && (
            <div className="evidence-panel animate-slide-up">
              <div className="panel-header">
                <h3><FileText size={20} /> New Evidence Review</h3>
                <button className="close-btn" onClick={() => setSelectedEvidenceRequest(null)}>&times;</button>
              </div>

              <div className="blockchain-receipt-detailed">
                <div className="receipt-header">Case Details</div>
                <div className="receipt-grid-ext" style={{ flexWrap: "wrap", gap: "1.5rem" }}>
                  <div className="r-item">
                    <span className="r-label">Case Number</span>
                    <span className="r-value">{selectedEvidenceRequest.caseDetails?.caseNumber || "N/A"}</span>
                  </div>
                  <div className="r-item">
                    <span className="r-label">Case Title</span>
                    <span className="r-value">{selectedEvidenceRequest.caseDetails?.title || "N/A"}</span>
                  </div>
                  <div className="r-item">
                    <span className="r-label">Case Status</span>
                    <span className="r-value">{selectedEvidenceRequest.caseDetails?.status || "N/A"}</span>
                  </div>
                  <div className="r-item" style={{ width: "100%" }}>
                    <span className="r-label">Description</span>
                    <span className="r-value">{selectedEvidenceRequest.caseDetails?.description || "No description"}</span>
                  </div>
                </div>
              </div>

              <h4>Evidence Request Details</h4>
              <table className="evidence-table">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Clerk Description</th>
                    <th>Type</th>
                    <th>Size (KB)</th>
                    <th>Requested At</th>
                    <th>Preview</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{selectedEvidenceRequest.fileName}</td>
                    <td>{selectedEvidenceRequest.description || "No description"}</td>
                    <td>{selectedEvidenceRequest.mimeType || "N/A"}</td>
                    <td>{selectedEvidenceRequest.fileSize ? (selectedEvidenceRequest.fileSize / 1024).toFixed(2) : "N/A"}</td>
                    <td>{new Date(selectedEvidenceRequest.uploadedAt).toLocaleString()}</td>
                    <td>
                      <a
                        href={getPendingPreviewUrl(selectedEvidenceRequest._id)}
                        target="_blank"
                        rel="noreferrer"
                        className="icon-link"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>

              <h4 style={{ marginTop: "1.5rem" }}>All Evidence For This Case</h4>
              <table className="evidence-table">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requestCaseEvidence.length > 0 ? (
                    requestCaseEvidence.map((e) => (
                      <tr key={e._id}>
                        <td>{e.fileName}</td>
                        <td>{e.status || "approved"}</td>
                        <td>
                          {e.ipfsHash ? (
                            <a href={`https://gateway.pinata.cloud/ipfs/${e.ipfsHash}`} target="_blank" rel="noreferrer" className="icon-link">
                              <ExternalLink size={16} />
                            </a>
                          ) : (
                            <span>Pending</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3">No evidence records found for this case.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="modal-actions">
                <button
                  className="approve-btn"
                  disabled={updatingEvidenceId === selectedEvidenceRequest._id}
                  onClick={() => updateEvidenceRequestStatus(selectedEvidenceRequest._id, "approved")}
                >
                  {updatingEvidenceId === selectedEvidenceRequest._id ? "Processing..." : "Approve And Upload"}
                </button>
                <button
                  className="reject-btn"
                  disabled={updatingEvidenceId === selectedEvidenceRequest._id}
                  onClick={() => updateEvidenceRequestStatus(selectedEvidenceRequest._id, "rejected")}
                >
                  Reject Evidence
                </button>
              </div>
            </div>
          )}

          {selectedCase && (
            <div className="evidence-panel animate-slide-up">
              <div className="panel-header">
                <h3><FileText size={20} /> Case Review: {selectedCase.caseNumber}</h3>
                <button className="close-btn" onClick={() => setSelectedCase(null)}>&times;</button>
              </div>

              {/* CLOCK IS USED HERE */}
              <div className="blockchain-receipt-detailed">
                <div className="receipt-header">Verification Snapshot</div>
                <div className="receipt-grid-ext">
                  <div className="r-item">
                    <span className="r-label">Block Number</span>
                    <span className="r-value">#{caseIntegrity[selectedCase._id]?.blockNumber || "---"}</span>
                  </div>
                  <div className="r-item">
                    <span className="r-label">Verified At</span>
                    <span className="r-value" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={14} /> 
                      {caseIntegrity[selectedCase._id]?.timestamp 
                        ? new Date(caseIntegrity[selectedCase._id].timestamp * 1000).toLocaleTimeString() 
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <h4><Activity size={16} /> Audit Timeline</h4>
              <div className="audit-timeline">
                {blockchainDetails[selectedCase._id]?.map((entry, index) => (
                  <div key={index} className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-block">Block #{entry.blockNumber}</span>
                        <span className="timeline-time">{new Date(entry.timestamp * 1000).toLocaleString()}</span>
                      </div>
                      <div className="timeline-body">
                        <strong>TX:</strong> <span className="mono">{entry.blockchainTx}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <hr />

              <h4>Evidence Files</h4>
              <table className="evidence-table">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {evidenceMap[selectedCase._id]?.length > 0 ? (
                    evidenceMap[selectedCase._id].map((e) => {
                      const status = caseIntegrity[selectedCase._id]?.files?.[e._id];
                      return (
                        <tr key={e._id}>
                          <td>{e.fileName}</td>
                          <td>
                            <span className={status === "verified" ? "tag-valid" : "tag-invalid"}>
                              {status === "verified" ? "🔒 Authentic" : "🚨 Tampered"}
                            </span>
                          </td>
                          <td>
                            <a href={`https://gateway.pinata.cloud/ipfs/${e.ipfsHash}`} target="_blank" rel="noreferrer" className="icon-link">
                              <ExternalLink size={16} />
                            </a>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="3">No evidence available for this case.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="modal-actions">
                {isPendingCase(selectedCase) && (
                  <>
                    <button
                      className="approve-btn"
                      disabled={updatingCaseId === selectedCase._id || caseIntegrity[selectedCase._id]?.status === "tampered"}
                      onClick={() => updateCaseStatus(selectedCase._id, "approved")}
                    >
                      {updatingCaseId === selectedCase._id ? "Processing..." : "Authorize Case"}
                    </button>
                    <button
                      className="reject-btn"
                      disabled={updatingCaseId === selectedCase._id}
                      onClick={() => updateCaseStatus(selectedCase._id, "rejected")}
                    >
                      Reject Request
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default JudgeDashboard;