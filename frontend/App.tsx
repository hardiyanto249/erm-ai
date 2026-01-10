import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import RiskManagement from './components/RiskManagement';
import ShariaCompliance from './components/ShariaCompliance';
import ZisTracking from './components/ZisTracking';
import LogRiskModal from './components/LogRiskModal';
import Login from './components/Login';
import { RiskItem, LazPartner } from './types';
import { getAuthToken, clearAuthToken, authFetch, getAuthHeaders } from './utils/auth';
import MitigationModal from './components/MitigationModal';

type View = 'dashboard' | 'risks' | 'compliance' | 'zis-tracking';

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getAuthToken());

  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isLogRiskModalOpen, setIsLogRiskModalOpen] = useState(false);

  // LAZ Context
  const [currentLaz, setCurrentLaz] = useState<LazPartner | null>(null);

  const [risks, setRisks] = useState<RiskItem[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    authFetch('http://localhost:8080/api/risks')
      .then(res => res.json())
      .then(data => setRisks(data || []))
      .catch(err => console.error("Error fetching risks:", err));
    setCurrentLaz({ id: 0, name: "Authorized Partner", scale: "Secure", description: "" });
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    clearAuthToken();
    setIsAuthenticated(false);
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
          const res = await fetch(`http://localhost:8080/api/risks`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(riskToSave)
          });
          if (!res.ok) throw new Error(`Failed to update risk ${riskToSave.id}`);
          savedRisks.push(riskToSave);
        } else {
          const res = await fetch(`http://localhost:8080/api/risks`, {
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
        const res = await fetch(`http://localhost:8080/api/risks?id=${riskId}`, {
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
    const dummyLazId = 0;
    switch (activeView) {
      case 'dashboard':
        return <Dashboard risks={risks} lazId={dummyLazId} />;
      case 'risks':
        return (
          <RiskManagement
            risks={risks}
            onLogNewRisk={handleOpenLogRiskModal}
            onEditRisk={handleOpenEditRiskModal}
            onDeleteRisk={handleDeleteRisk}
            onMitigateRisk={handleOpenMitigation}
          />
        );
      case 'compliance':
        return <ShariaCompliance key={activeView} lazId={dummyLazId} />;
      case 'zis-tracking':
        return <ZisTracking key={activeView} lazId={dummyLazId} />;
      default:
        return <Dashboard risks={risks} lazId={dummyLazId} />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-base-300 text-base-content font-sans">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          lazName={currentLaz?.name || "Access Token User"}
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
