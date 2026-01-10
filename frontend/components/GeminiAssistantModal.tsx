
import React, { useState, useCallback } from 'react';
import { identifyRisksFromScenario } from '../services/geminiService';
import { RiskItem } from '../types';

interface GeminiAssistantModalProps {
  onClose: () => void;
  onAddRisks: (newRisks: RiskItem[]) => void;
  currentRiskCount: number;
}

const LoadingSpinner = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

const GeminiAssistantModal: React.FC<GeminiAssistantModalProps> = ({ onClose, onAddRisks, currentRiskCount }) => {
  const [scenario, setScenario] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!scenario.trim()) {
      setError("Please describe a scenario.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const newRisks = await identifyRisksFromScenario(scenario, currentRiskCount + 1);
      onAddRisks(newRisks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [scenario, onAddRisks, currentRiskCount]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 scale-95 hover:scale-100">
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Gemini Risk Assistant</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
          </div>
          <p className="text-base-content">
            Describe a new initiative, process, or event. Gemini will analyze it based on the ERM framework and identify potential risks.
          </p>
          <div>
            <label htmlFor="scenario" className="block text-sm font-medium text-gray-300 mb-2">
              Scenario Description
            </label>
            <textarea
              id="scenario"
              rows={4}
              className="w-full p-3 bg-base-200 border border-base-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
              placeholder="E.g., 'Meluncurkan kampanye pengumpulan dana qurban secara online melalui platform media sosial baru...'"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              disabled={isLoading}
            />
          </div>
          {error && <p className="text-sm text-error text-center">{error}</p>}
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg bg-base-300 text-white hover:bg-opacity-80 transition"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-opacity-80 transition flex items-center justify-center disabled:bg-opacity-50"
              disabled={isLoading}
            >
              {isLoading ? <LoadingSpinner /> : 'Analyze & Identify Risks'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeminiAssistantModal;
