import React, { useState, useEffect, useMemo } from 'react';
import KpiCard from './KpiCard';
import GaugeChart from './GaugeChart';
import RiskTable from './RiskTable';
import RiskCategoryChart from './RiskCategoryChart';
import RiskTrendChart from './RiskTrendChart';
import RiskMatrix from './RiskMatrix';
import { RiskItem, Kpi, RiskCategory, RiskStatus, getCategoryDisplayName } from '../types';
import { authFetch } from '../utils/auth';
import DataImportModal from './DataImportModal';

const rhaGoodThreshold = 12.5;
const acrGoodThreshold = 10;

// Early Warning System (EWS) Component
const EarlyWarningBanner: React.FC<{ messages: string[] }> = ({ messages }) => {
    if (messages.length === 0) return null;

    return (
        <div className="bg-yellow-500/20 border-l-4 border-yellow-400 text-yellow-300 p-4 rounded-lg shadow-lg mb-8" role="alert">
            <div className="flex items-center">
                <div className="py-1">
                    <svg className="fill-current h-6 w-6 text-yellow-400 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM9 5v6h2V5H9zm0 8h2v-2H9v2z" /></svg>
                </div>
                <div>
                    <p className="font-bold text-white">Early Warning System Activated</p>
                    <ul className="list-disc list-inside text-sm">
                        {messages.map((msg, index) => <li key={index}>{msg}</li>)}
                    </ul>
                </div>
            </div>
        </div>
    );
};


interface DashboardProps {
    risks: RiskItem[];
    lazId: number;
}

const Dashboard: React.FC<DashboardProps> = ({ risks, lazId }) => {
    const [rhaValue, setRhaValue] = useState(0);
    const [acrValue, setAcrValue] = useState(0);
    const [avgMitigationDays, setAvgMitigationDays] = useState("12 days");
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // State for Anomaly Detection
    interface AnomalyData {
        metric_name: string;
        current_value: number;
        is_anomaly: boolean;
        normal_mean: number;
        normal_std_dev: number;
        threshold_upper: number;
        threshold_lower: number;
        message: string;
    }

    const [rhaAnomaly, setRhaAnomaly] = useState<AnomalyData | null>(null);
    const [acrAnomaly, setAcrAnomaly] = useState<AnomalyData | null>(null);

    // State for Predictive Analysis (Model B)
    interface PredictionData {
        predictor: string;
        target: string;
        correlation: number;
        current_input: number;
        predicted_value: number;
        message: string;
    }
    const [predictions, setPredictions] = useState<PredictionData[]>([]);

    useEffect(() => {
        const fetchMetrics = async () => {
            const res = await authFetch(`http://localhost:8080/api/metrics`);
            if (res.ok) {
                const data = await res.json();
                if (data.RHA !== undefined) setRhaValue(data.RHA);
                if (data.ACR !== undefined) setAcrValue(data.ACR);
            }
        };

        const fetchAnomalies = async () => {
            try {
                const res = await authFetch(`http://localhost:8080/api/analytics/anomaly`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.RHA) setRhaAnomaly(data.RHA);
                    if (data.ACR) setAcrAnomaly(data.ACR);
                }
            } catch (err) {
                console.error("Error fetching anomaly detection:", err);
            }
        };

        const fetchPredictions = async () => {
            try {
                const res = await authFetch(`http://localhost:8080/api/analytics/prediction`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setPredictions(data);
                    } else if (data) {
                        setPredictions([data]);
                    }
                }
            } catch (err) {
                console.error("Error fetching predictive analysis:", err);
            }
        };

        fetchMetrics();
        fetchAnomalies();
        fetchPredictions();
    }, [lazId]);

    const highPriorityRisks = risks.filter(risk => (risk.impact === 'Critical' || risk.impact === 'High') && risk.status === 'Open');
    const complianceIssuesCount = risks.filter(r => r.category === 'ShariaCompliance' && r.status === 'Open').length;

    const kpiData: Kpi[] = [
        { title: "Total Risks Logged", value: risks.length.toString(), description: "All identified risks", trend: 'stable' },
        { title: "Open Critical/High Risks", value: highPriorityRisks.length.toString(), description: "Requiring immediate attention", trend: highPriorityRisks.length > 3 ? 'up' : 'stable' },
        { title: "Compliance Issues", value: complianceIssuesCount.toString(), description: "Open Sharia compliance risks", trend: complianceIssuesCount > 1 ? 'up' : 'down' },
        { title: "Avg. Mitigation Time", value: avgMitigationDays, description: "Time to close open risks", trend: 'stable' },
    ];

    const warningMessages: string[] = [];
    const hasOpenCriticalRisk = risks.some(r => r.impact === 'Critical' && r.status === 'Open');

    if (hasOpenCriticalRisk) {
        warningMessages.push("Terdapat risiko 'Kritis' yang masih berstatus 'Open'. Perlu penanganan segera.");
    }

    if (rhaAnomaly && rhaAnomaly.is_anomaly) {
        warningMessages.push(`⚠️ Anomaly RHA: ${rhaAnomaly.current_value.toFixed(1)}% (Normal: ${rhaAnomaly.threshold_lower.toFixed(1)}% - ${rhaAnomaly.threshold_upper.toFixed(1)}%). Deviation detected!`);
    } else if (rhaValue > rhaGoodThreshold) {
        warningMessages.push(`Rasio Hak Amil (RHA) (${rhaValue.toFixed(1)}%) melebihi batas ideal (${rhaGoodThreshold}%).`);
    }

    if (acrAnomaly && acrAnomaly.is_anomaly) {
        warningMessages.push(`⚠️ Anomaly ACR: ${acrAnomaly.current_value.toFixed(1)}% (Normal: ${acrAnomaly.threshold_lower.toFixed(1)}% - ${acrAnomaly.threshold_upper.toFixed(1)}%). Unusual spike detected!`);
    } else if (acrValue > acrGoodThreshold) {
        warningMessages.push(`Saldo Kas Mengendap (ACR) (${acrValue.toFixed(1)}%) melebihi batas ideal (${acrGoodThreshold}%).`);
    }

    predictions.forEach(pred => {
        const threshold = pred.target === 'RHA' ? rhaGoodThreshold : acrGoodThreshold;
        if (pred.predicted_value > threshold) {
            warningMessages.push(`🔮 PREDICTION: High ${pred.predictor} implies ${pred.target} may reach ${pred.predicted_value.toFixed(1)}% soon.`);
        }
    });

    const categoryChartData = useMemo(() => {
        const categoryKeys = Object.keys(RiskCategory) as (keyof typeof RiskCategory)[];
        const categoryCounts: { [key: string]: { [key: string]: number } } = {};
        categoryKeys.forEach(catKey => {
            categoryCounts[catKey] = { Open: 0, Mitigated: 0, Monitoring: 0, Closed: 0 };
        });
        risks.forEach(risk => {
            if (categoryCounts[risk.category]) {
                categoryCounts[risk.category][risk.status]++;
            }
        });
        return categoryKeys.map(catKey => ({
            name: getCategoryDisplayName(catKey),
            ...categoryCounts[catKey]
        }));
    }, [risks]);


    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-base-content">Dashboard Overview</h1>
                <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Import Historical Data
                </button>
            </div>

            <EarlyWarningBanner messages={warningMessages} />

            {predictions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {predictions.map((prediction, idx) => (
                        <div key={idx} className="bg-gradient-to-r from-indigo-900 to-slate-900 p-6 rounded-xl shadow-xl border border-indigo-500/30">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <span className="text-2xl">🔮</span> {prediction.target} Prediction
                                    </h3>
                                    <p className="text-indigo-200 mt-2 text-sm">
                                        Correlated with <span className="text-white font-bold">{prediction.predictor}</span>.
                                        Correlation: {(prediction.correlation * 100).toFixed(0)}%.
                                    </p>
                                    <p className="text-xs text-indigo-400 mt-1 italic">"{prediction.message}"</p>

                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-indigo-300 uppercase font-bold">
                                                {prediction.predictor.split(' +')[0].split(' (')[0]}
                                            </p>
                                            <p className="text-xl text-white font-mono">
                                                {prediction.current_input > 1000
                                                    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(prediction.current_input)
                                                    : prediction.current_input.toFixed(1)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-indigo-300 uppercase font-bold">Predicted {prediction.target}</p>
                                            <p className={`text-2xl font-bold font-mono ${(prediction.target === 'RHA' && prediction.predicted_value > rhaGoodThreshold) ||
                                                (prediction.target === 'ACR' && prediction.predicted_value > acrGoodThreshold)
                                                ? 'text-red-400' : 'text-emerald-400'
                                                }`}>
                                                {prediction.predicted_value.toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiData.map(kpi => <KpiCard key={kpi.title} {...kpi} />)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-base-100 p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-semibold text-white mb-4">Reputational Risk Indicators (Dynamic Anomaly Detection)</h3>
                    <p className="text-sm text-base-content mb-6">Monitoring key ratios against both static limits and dynamic historical normal ranges.</p>
                    <div className="flex flex-col md:flex-row items-center justify-around gap-6">
                        <div className="flex flex-col items-center">
                            <GaugeChart
                                value={parseFloat(rhaValue.toFixed(1))}
                                maxValue={25}
                                label="Rasio Hak Amil (RHA)"
                                unit="%"
                                goodThreshold={rhaGoodThreshold}
                                warningThreshold={15}
                            />
                            {rhaAnomaly && (
                                <div className={`text-xs mt-2 p-2 rounded border ${rhaAnomaly.is_anomaly ? 'bg-red-900/20 border-red-500 text-red-200' : 'bg-emerald-900/20 border-emerald-500 text-emerald-200'}`}>
                                    <p className="font-bold">{rhaAnomaly.is_anomaly ? "ANOMALY DETECTED" : "Normal Heartbeat"}</p>
                                    <p>Safe Range: {rhaAnomaly.threshold_lower.toFixed(1)}% - {rhaAnomaly.threshold_upper.toFixed(1)}%</p>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col items-center">
                            <GaugeChart
                                value={parseFloat(acrValue.toFixed(1))}
                                maxValue={20}
                                label="Saldo Kas Mengendap (ACR)"
                                unit="%"
                                goodThreshold={acrGoodThreshold}
                                warningThreshold={15}
                            />
                            {acrAnomaly && (
                                <div className={`text-xs mt-2 p-2 rounded border ${acrAnomaly.is_anomaly ? 'bg-red-900/20 border-red-500 text-red-200' : 'bg-emerald-900/20 border-emerald-500 text-emerald-200'}`}>
                                    <p className="font-bold">{acrAnomaly.is_anomaly ? "ANOMALY DETECTED" : "Normal Heartbeat"}</p>
                                    <p>Safe Range: {acrAnomaly.threshold_lower.toFixed(1)}% - {acrAnomaly.threshold_upper.toFixed(1)}%</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="bg-base-100 p-6 rounded-xl shadow-lg flex flex-col">
                    <h3 className="text-xl font-semibold text-white mb-4">High Priority Risks</h3>
                    <p className="text-sm text-base-content mb-4">Risks requiring immediate attention.</p>
                    <div className="flex-grow overflow-y-auto">
                        <RiskTable risks={highPriorityRisks} isCompact={true} />
                    </div>
                </div>
            </div>

            <div className="mb-6">
                {/* RiskTrendChart is self-contained grid now */}
                <RiskTrendChart />
            </div>

            <div className="bg-base-100 p-6 rounded-xl shadow-lg">
                <RiskMatrix risks={risks} />
            </div>

            <div className="bg-base-100 p-6 rounded-xl shadow-lg">
                <RiskCategoryChart data={categoryChartData} />
            </div>

            {isImportModalOpen && (
                <DataImportModal
                    onClose={() => setIsImportModalOpen(false)}
                    onSuccess={() => {
                        window.location.reload(); // Simple refresh for now
                    }}
                />
            )}
        </div>
    );
};

export default Dashboard;
