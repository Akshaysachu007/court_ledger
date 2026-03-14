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
  Activity
} from "lucide-react";
import "../styles/JudgeDashboard.css";

function JudgeDashboard() {
  const judgeId = localStorage.getItem("userId");
  const navigate = useNavigate();

  // Data States
  const [cases, setCases] = useState([]);
  const [caseIntegrity, setCaseIntegrity] = useState({});
  const [tamperedEvidence, setTamperedEvidence] = useState([]);
  const [evidenceMap, setEvidenceMap] = useState({});
  const [blockchainDetails, setBlockchainDetails] = useState({});

  // UI States
  const [activeTab, setActiveTab] = useState("new");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCase, setSelectedCase] = useState(null);
  const [updatingCaseId, setUpdatingCaseId] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (!judgeId) navigate("/");
    else fetchAssignedCases();
  }, [judgeId, navigate, fetchAssignedCases]);

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

  const filteredCases = cases.filter((c) => {
    const matchesSearch = 
      c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "new") return matchesSearch && isPendingCase(c);
    if (activeTab === "all") return matchesSearch && isResolvedCase(c);
    if (activeTab === "tampered") return matchesSearch && caseIntegrity[c._id]?.status === "tampered";
    return matchesSearch;
  });

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">LegalChain</div>
        <nav>
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
                          <button className="view-btn" onClick={() => setSelectedCase(c)}>
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