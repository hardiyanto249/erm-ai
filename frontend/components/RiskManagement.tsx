
import React from 'react';
import RiskTable from './RiskTable';
import { RiskItem } from '../types';

import { authFetch } from '../utils/auth';

interface RiskManagementProps {
    risks: RiskItem[];
    onLogNewRisk: () => void;
    onEditRisk: (risk: RiskItem) => void;
    onDeleteRisk: (riskId: string) => void;
    onMitigateRisk: (risk: RiskItem) => void;
}

const RiskManagement: React.FC<RiskManagementProps> = ({ risks, onLogNewRisk, onEditRisk, onDeleteRisk, onMitigateRisk }) => {
    const handleDownloadReport = async () => {
        try {
            const res = await authFetch('http://localhost:8080/api/reports/risk-register');
            if (!res.ok) throw new Error("Download failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Risk_Register_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            console.error(e);
            alert("Failed to download report");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Risk Register</h1>
                <div className="flex gap-3">
                    <button
                        onClick={handleDownloadReport}
                        className="px-4 py-2 bg-base-300 text-white font-semibold rounded-lg hover:bg-base-100 border border-base-content/20 transition-colors flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download PDF
                    </button>
                    <button
                        onClick={onLogNewRisk}
                        className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-opacity-80 transition-colors"
                    >
                        Log New Risk
                    </button>
                </div>
            </div>
            <p className="text-base-content">
                This register contains all identified risks across the organization, categorized by type, impact, and likelihood.
            </p>
            <div className="bg-base-100 p-4 rounded-xl shadow-lg">
                <RiskTable risks={risks} onEdit={onEditRisk} onDelete={onDeleteRisk} onMitigate={onMitigateRisk} />
            </div>
        </div>
    );
};

export default RiskManagement;
