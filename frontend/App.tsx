import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import RiskManagement from './components/RiskManagement';
import ShariaCompliance from './components/ShariaCompliance';
import ZisTracking from './components/ZisTracking';
import LogRiskModal from './components/LogRiskModal';
import Login from './components/Login';
import RHAPredictionForm from './components/RHAPredictionForm';
import { RiskItem, LazPartner } from './types';
import { getAuthToken, clearAuthToken, authFetch, getAuthHeaders } from './utils/auth';
import { API_BASE_URL } from './utils/config';
import MitigationModal from './components/MitigationModal';
import Configuration from './components/Configuration';

type View = 'dashboard' | 'risks' | 'compliance' | 'zis-tracking' | 'configuration' | 'prediction';

const App: React.FC = () => {
  // Auth State
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getAuthToken());
  // Strictly check email for Admin role based on user request
  const [userRole, setUserRole] = useState<string>(
    localStorage.getItem('user_email') === 'admin@erm.com' ? 'Admin' : 'Staff'
  );

  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isLogRiskModalOpen, setIsLogRiskModalOpen] = useState(false);

  // LAZ Context
  const [currentLaz, setCurrentLaz] = useState<LazPartner | null>(null);
  const [selectedLazId, setSelectedLazId] = useState<number>(0);

  const [risks, setRisks] = useState<RiskItem[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Fetch Risks - Include laz_id param if selected (for Admin)
    const url = selectedLazId > 0
      ? `${API_BASE_URL}/api/risks?laz_id=${selectedLazId}`
      : `${API_BASE_URL}/api/risks`;

    authFetch(url)
      .then(res => {
        // handle 400 or empty
        if (!res.ok) return [];
        return res.json();
      })
      .then(data => setRisks(data || []))
      .catch(err => console.error("Error fetching risks:", err));

    const storedLazName = localStorage.getItem('laz_name') || "User";
    const displayName = userRole === 'Admin'
      ? (selectedLazId > 0 ? "Partner View" : "Admin Console")
      : storedLazName;

    setCurrentLaz({ id: selectedLazId, name: displayName, scale: "", description: "" });
  }, [isAuthenticated, selectedLazId, userRole]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    const email = localStorage.getItem('user_email');
    setUserRole(email === 'admin@erm.com' ? 'Admin' : 'Staff');
  };

  const handleLogout = () => {
    clearAuthToken();
    setIsAuthenticated(false);
    setUserRole('Staff');
    setSelectedLazId(0);
  };

  const [editingRisk, setEditingRisk] = useState<RiskItem | null>(null);
  const [mitigationRisk, setMitigationRisk] = useState<RiskItem | null>(null);

  // Handlers
  const handleOpenLogRiskModal = () => {
    setEditingRisk(null);
    setIsLogRiskModalOpen(true);
  };

  const handleOpenEditRiskModal = (risk: RiskItem) => {
    setEditingRisk(risk);
    setIsLogRiskModalOpen(true);
  };

  const handleCloseLogRiskModal = () => {
    setIsLogRiskModalOpen(false);
    setEditingRisk(null);
  };

  const handleOpenMitigation = (risk: RiskItem) => {
    setMitigationRisk(risk);
  };

  const handleCloseMitigation = () => {
    setMitigationRisk(null);
  };

  const handleSaveRisk = async (riskOrRisks: RiskItem | RiskItem[]) => {
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
      const risksToProcess = Array.isArray(riskOrRisks) ? riskOrRisks : [riskOrRisks];
      const savedRisks: RiskItem[] = [];

      for (const riskToSave of risksToProcess) {
        const isExisting = risks.some(r => r.id === riskToSave.id);
        if (isExisting) {
          const res = await fetch(`${API_BASE_URL}/api/risks`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(riskToSave)
          });
          if (!res.ok) throw new Error(`Failed to update risk ${riskToSave.id}`);
          savedRisks.push(riskToSave);
        } else {
          const res = await fetch(`${API_BASE_URL}/api/risks`, {
            method: 'POST',
            headers,
            body: JSON.stringify(riskToSave)
          });
          if (!res.ok) throw new Error(`Failed to create risk ${riskToSave.id}`);
          savedRisks.push(riskToSave);
        }
      }

      setRisks(prevRisks => {
        let newRisks = [...prevRisks];
        savedRisks.forEach(saved => {
          const idx = newRisks.findIndex(r => r.id === saved.id);
          if (idx !== -1) {
            newRisks[idx] = saved;
          } else {
            newRisks.push(saved);
          }
        });
        return newRisks;
      });

      setIsLogRiskModalOpen(false);
      setEditingRisk(null);
      setMitigationRisk(null); // Close mitigation if open via save (shared logic)
    } catch (error) {
      console.error("Error saving risk:", error);
      alert("Failed to save risk(s)");
    }
  };

  const handleDeleteRisk = async (riskId: string) => {
    if (window.confirm('Are you sure you want to delete this risk? This action cannot be undone.')) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/risks?id=${riskId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error("Failed to delete risk");
        setRisks(prevRisks => prevRisks.filter(r => r.id !== riskId));
      } catch (error) {
        console.error("Error deleting risk:", error);
        alert("Failed to delete risk");
      }
    }
  };

  const renderView = () => {
    const isReadOnly = userRole === 'Admin';
    switch (activeView) {
      case 'dashboard':
        return <Dashboard risks={risks} lazId={selectedLazId} isReadOnly={isReadOnly} lazName={currentLaz?.name} />;
      case 'risks':
        return (
          <RiskManagement
            risks={risks}
            onLogNewRisk={handleOpenLogRiskModal}
            onEditRisk={handleOpenEditRiskModal}
            onDeleteRisk={handleDeleteRisk}
            onMitigateRisk={handleOpenMitigation}
            isReadOnly={isReadOnly}
          />
        );
      case 'compliance':
        return <ShariaCompliance key={activeView} lazId={selectedLazId} isReadOnly={isReadOnly} />;
      case 'zis-tracking':
        return <ZisTracking key={activeView} lazId={selectedLazId} />;
      case 'prediction':
        return <RHAPredictionForm lazId={selectedLazId} />;
      case 'configuration':
        return <Configuration />;
      default:
        return <Dashboard risks={risks} lazId={selectedLazId} isReadOnly={isReadOnly} lazName={currentLaz?.name} />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-base-300 text-base-content font-sans">
      <Sidebar activeView={activeView} setActiveView={setActiveView} userRole={userRole} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          lazName={currentLaz?.name || "User"}
          role={userRole}
          selectedLazId={selectedLazId}
          onLazSelect={setSelectedLazId}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-base-200 p-4 md:p-8">
          {renderView()}
        </main>
      </div>
      {isLogRiskModalOpen && (
        <LogRiskModal
          onClose={handleCloseLogRiskModal}
          onSave={handleSaveRisk}
          riskToEdit={editingRisk}
          currentRiskCount={risks.length}
          isReadOnly={userRole === 'Admin'}
        />
      )}
      {mitigationRisk && (
        <MitigationModal
          risk={mitigationRisk}
          onClose={handleCloseMitigation}
          onSave={handleSaveRisk}
        />
      )}
    </div>
  );
};

export default App;
