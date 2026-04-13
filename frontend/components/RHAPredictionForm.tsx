import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/config';
import { getAuthHeaders } from '../utils/auth';

interface PredictionResult {
  model_type: string;
  predictor: string;
  target: string;
  correlation: number;
  current_input: number;
  predicted_value: number;
  coefficients?: number[];
  message: string;
  data_from?: string;   // tanggal data tertua dalam window
  data_to?: string;     // tanggal data terbaru dalam window
  window?: string;      // deskripsi window ("5 tahun terakhir")
}

interface RHAPredictionFormProps {
  lazId: number;
}

const RHAPredictionForm: React.FC<RHAPredictionFormProps> = ({ lazId }) => {
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // What-If Simulator state
  const [whatIfTarget, setWhatIfTarget] = useState<'RHA' | 'ACR'>('RHA');
  const [whatIfCost, setWhatIfCost] = useState<number>(0);
  const [whatIfResult, setWhatIfResult] = useState<number | null>(null);

  const fetchPredictions = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Kirim laz_id sebagai query param agar backend (Admin impersonation) bisa serve data yang benar
      const url = lazId > 0
        ? `${API_BASE_URL}/api/analytics/prediction?laz_id=${lazId}`
        : `${API_BASE_URL}/api/analytics/prediction`;

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Gagal mengambil data prediksi dari server.');
      const data: PredictionResult[] = await res.json();
      setPredictions(data || []);

      // === AUTO-POPULATE What-If dengan nilai real terkini (Default dari DB) ===
      const rhaPred = data?.find(p => p.target === 'RHA');
      if (rhaPred && rhaPred.current_input !== undefined) {
        setWhatIfCost(rhaPred.current_input);
      }
      setWhatIfResult(null); // Reset hasil simulator saat data baru dimuat
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPredictions(); }, [lazId]);

  // What-If Calculation using returned coefficients
  const handleWhatIfSimulate = () => {
    const targetPred = predictions.find(p => p.target === whatIfTarget);
    if (!targetPred || !targetPred.coefficients || targetPred.coefficients.length === 0) {
      alert(`Data koefisien model untuk ${whatIfTarget} belum tersedia.`);
      return;
    }
    const intercept = targetPred.coefficients[0] || 0;
    const coeff = targetPred.coefficients[1] || targetPred.coefficients[0] || 0;
    const simResult = intercept + coeff * whatIfCost;
    setWhatIfResult(simResult);
  };

  // Saat target berubah, update input ke nilai terkini target tersebut & reset hasil
  const handleTargetChange = (target: 'RHA' | 'ACR') => {
    setWhatIfTarget(target);
    setWhatIfResult(null);
    const targetPred = predictions.find(p => p.target === target);
    if (targetPred && targetPred.current_input !== undefined) {
      setWhatIfCost(targetPred.current_input);
    }
  };

  const getRiskColor = (value: number, target: string) => {
    if (target === 'RHA') return value > 12.5 ? 'text-red-500' : 'text-emerald-500';
    if (target === 'ACR') return value > 10 ? 'text-red-500' : 'text-emerald-500';
    return 'text-blue-500';
  };

  const getRiskBadge = (value: number, target: string) => {
    if (target === 'RHA') {
      return value > 12.5
        ? { label: 'MELEWATI BATAS', color: 'bg-red-100 text-red-700 border-red-200' }
        : { label: 'DALAM BATAS AMAN', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    }
    if (target === 'ACR') {
      return value > 10
        ? { label: 'MELEWATI BATAS', color: 'bg-red-100 text-red-700 border-red-200' }
        : { label: 'DALAM BATAS AMAN', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    }
    return { label: 'NORMAL', color: 'bg-blue-100 text-blue-700 border-blue-200' };
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">🤖 AI Predictive Analytics</h2>
          <p className="text-gray-400 mt-1 text-sm">
            Prediksi RHA & ACR berbasis model regresi multivariat otomatis dari data historis LAZ Anda.
          </p>
        </div>
        <button
          onClick={fetchPredictions}
          disabled={isLoading || lazId === 0}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg transition-all active:scale-95"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          {isLoading ? 'Memproses...' : 'Refresh Prediksi'}
        </button>
      </div>

      {/* Data Freshness Banner */}
      {predictions.length > 0 && predictions[0].data_from && (
        <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-blue-400 text-lg">📅</span>
            <div>
              <p className="text-blue-300 text-sm font-semibold">Periode Data Model (Rolling Window {predictions[0].window})</p>
              <p className="text-blue-400/70 text-xs mt-0.5">
                Data dari <strong className="text-blue-300">{predictions[0].data_from}</strong> s/d <strong className="text-blue-300">{predictions[0].data_to}</strong>
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs bg-blue-800/50 text-blue-300 px-2 py-1 rounded-lg font-medium">
              ♻️ Auto-Retrain setiap request
            </span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 px-5 py-4 rounded-xl flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Admin Notice - hanya jika benar-benar tidak ada data sama sekali */}
      {!isLoading && predictions.length === 0 && !error && (
        <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-300 px-5 py-4 rounded-xl">
          <p className="text-sm">📊 Data prediksi belum tersedia. Pastikan sudah import data historis XLSX terlebih dahulu melalui tombol "Import Historical Data" di Dashboard.</p>
        </div>
      )}

      {/* Prediction Cards */}
      {!isLoading && predictions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {predictions.map((pred) => {
            const badge = getRiskBadge(pred.predicted_value, pred.target);
            return (
              <div key={pred.target} className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
                {/* Card Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">TARGET METRIK</p>
                    <h3 className="text-xl font-bold text-white mt-0.5">
                      {pred.target === 'RHA' ? '📊 Rasio Hak Amil (RHA)' : '💰 Amil Cost Ratio (ACR)'}
                    </h3>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>

                {/* Predicted Value */}
                <div className="bg-gray-900 rounded-xl p-4 mb-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">PREDIKSI NILAI</p>
                  <p className={`text-5xl font-black ${getRiskColor(pred.predicted_value, pred.target)}`}>
                    {pred.predicted_value.toFixed(2)}
                    <span className="text-2xl font-semibold text-gray-400">%</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Batas: {pred.target === 'RHA' ? '12.5%' : '10%'} (Ketentuan Syariah)
                  </p>
                </div>

                {/* Model Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Tipe Model</span>
                    <span className="text-white font-medium bg-blue-900/50 px-2 py-0.5 rounded text-xs">{pred.model_type}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Prediktor Utama</span>
                    <span className="text-emerald-400 font-medium text-xs text-right max-w-[60%]">{pred.predictor}</span>
                  </div>
                  {pred.correlation > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Akurasi Model (R²)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(pred.correlation * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-blue-400 font-bold text-xs">{(pred.correlation * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Input Terkini</span>
                    <span className="text-white font-medium">{pred.current_input.toFixed(2)}</span>
                  </div>
                </div>

                {/* Message */}
                <div className="mt-4 bg-gray-700/50 rounded-lg p-3">
                  <p className="text-xs text-gray-300 leading-relaxed">💡 {pred.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty / Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg className="animate-spin h-12 w-12 text-emerald-500 mb-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="font-semibold">Melatih Model & Menghitung Prediksi...</p>
          <p className="text-sm mt-1">Menganalisis data historis 30 hari</p>
        </div>
      )}

      {/* ===== WHAT-IF SIMULATOR ===== */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-indigo-700/50 shadow-xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">🎯 What-If Simulator</h3>
            <p className="text-gray-400 text-sm">
              Simulasikan prediksi <strong className="text-indigo-300">{whatIfTarget}</strong> dengan nilai{' '}
              <strong className="text-indigo-300">
                {predictions.find(p => p.target === whatIfTarget)?.predictor || 'prediktor utama'}
              </strong> yang berbeda
            </p>
          </div>
        </div>

        {/* Target Toggle: RHA / ACR */}
        <div className="flex gap-2 mb-5">
          {(['RHA', 'ACR'] as const).map(t => (
            <button
              key={t}
              onClick={() => handleTargetChange(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                whatIfTarget === t
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              Simulasi {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Nilai <span className="text-indigo-300 font-bold">
                {predictions.find(p => p.target === whatIfTarget)?.predictor || 'Prediktor'}
              </span> yang Disimulasikan
            </label>
            <input
              type="number"
              value={whatIfCost}
              onChange={e => setWhatIfCost(Number(e.target.value))}
              placeholder="Masukkan nilai..."
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Nilai saat ini (dari data historis): <strong className="text-gray-300">
                {predictions.find(p => p.target === whatIfTarget)?.current_input?.toLocaleString('id-ID') ?? '-'}
              </strong>
            </p>
          </div>
          <button
            onClick={handleWhatIfSimulate}
            disabled={predictions.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95"
          >
            Simulasikan {whatIfTarget}
          </button>
        </div>

        {/* What-If Result */}
        {whatIfResult !== null && (
          <div className="mt-5 bg-indigo-900/30 border border-indigo-700 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-300 font-medium">Hasil Simulasi: Prediksi {whatIfTarget}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Jika {predictions.find(p => p.target === whatIfTarget)?.predictor} = {whatIfCost.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-4xl font-black ${
                whatIfTarget === 'RHA'
                  ? whatIfResult > 12.5 ? 'text-red-400' : 'text-emerald-400'
                  : whatIfResult > 20 ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {whatIfResult.toFixed(2)}%
              </p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                (whatIfTarget === 'RHA' ? whatIfResult > 12.5 : whatIfResult > 20)
                  ? 'bg-red-900/50 text-red-300'
                  : 'bg-emerald-900/50 text-emerald-300'
              }`}>
                {(whatIfTarget === 'RHA' ? whatIfResult > 12.5 : whatIfResult > 20)
                  ? `⚠️ MELEBIHI BATAS (${whatIfTarget === 'RHA' ? '12.5%' : '20%'})`
                  : `✅ AMAN (Batas: ${whatIfTarget === 'RHA' ? '12.5%' : '20%'})`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Methodology Note */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="font-semibold text-gray-400">📌 Metodologi:</span> Model prediksi menggunakan <strong className="text-gray-300">Regresi Linear Multivariat</strong> berbasis data historis 30 hari. 
          Sistem secara otomatis memilih prediktor terbaik (PromotionCost untuk RHA, PendingProposals untuk ACR). 
          Jika data tidak cukup, sistem beralih ke model <strong className="text-gray-300">Time-Series Trend</strong>. 
          Nilai R² menunjukkan akurasi model (semakin mendekati 1.0 = semakin akurat).
        </p>
      </div>
    </div>
  );
};

export default RHAPredictionForm;
