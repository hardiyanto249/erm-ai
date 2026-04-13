import React, { useState, useEffect } from 'react';
import { RiskItem, RiskCategory, RiskImpact, RiskLikelihood, RiskStatus } from '../types';
import { authFetch } from '../utils/auth';
import { API_BASE_URL } from '../utils/config';

interface LogRiskModalProps {
  onClose: () => void;
  onSave: (risk: RiskItem) => void;
  riskToEdit?: RiskItem | null;
  currentRiskCount: number;
  isReadOnly?: boolean;
}

interface GeneratedRisk {
  id: string;
  category: string;
  description: string;
  impact: string;
  likelihood: string;
  status: string;
  reasoning: string;
  context?: string;
}

const LogRiskModal: React.FC<LogRiskModalProps> = ({ onClose, onSave, riskToEdit, currentRiskCount, isReadOnly }) => {
  const [description, setDescription] = useState('');
  const [context, setContext] = useState('');
  const [category, setCategory] = useState<keyof typeof RiskCategory>('Operational');
  const [impact, setImpact] = useState<keyof typeof RiskImpact>('Low');
  const [likelihood, setLikelihood] = useState<keyof typeof RiskLikelihood>('Low');
  const [status, setStatus] = useState<keyof typeof RiskStatus>('Open');
  const [error, setError] = useState<string | null>(null);

  // AI Gen State
  const [eventType, setEventType] = useState('');
  const [generatedRisks, setGeneratedRisks] = useState<GeneratedRisk[]>([]);
  const [selectedRiskIndices, setSelectedRiskIndices] = useState<Set<number>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  const isEditMode = !!riskToEdit;

  useEffect(() => {
    if (isEditMode && riskToEdit) {
      setDescription(riskToEdit.description);
      setContext(riskToEdit.context || '');
      setCategory(riskToEdit.category as keyof typeof RiskCategory);
      setImpact(riskToEdit.impact as keyof typeof RiskImpact);
      setLikelihood(riskToEdit.likelihood as keyof typeof RiskLikelihood);
      setStatus(riskToEdit.status as keyof typeof RiskStatus);
    }
  }, [riskToEdit, isEditMode]);

  const handleGenerateRisks = async () => {
    if (!eventType) return;
    setIsGenerating(true);
    setGeneratedRisks([]);
    setSelectedRiskIndices(new Set());
    setError(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/generate-risks`, {
        method: 'POST',
        body: JSON.stringify({ eventType }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to generate risks');
      }
      
      const data = await res.json();
      setGeneratedRisks(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate risks from AI.");
    } finally {
      setIsGenerating(false);
    }
  };


  const toggleSelection = (index: number) => {
    const newSet = new Set(selectedRiskIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedRiskIndices(newSet);
  };

  const handleBatchSave = () => {
    if (selectedRiskIndices.size === 0) return;

    const risksToSave: RiskItem[] = [];
    let counter = currentRiskCount + 1;

    generatedRisks.forEach((gen, idx) => {
      if (selectedRiskIndices.has(idx)) {
        const newRisk: RiskItem = {
          id: '', // Biarkan backend/database yang generate ID unik
          description: gen.description,
          category: (gen.category in RiskCategory) ? gen.category as keyof typeof RiskCategory : 'Operational',
          impact: (gen.impact in RiskImpact) ? gen.impact as keyof typeof RiskImpact : 'Low',
          likelihood: (gen.likelihood in RiskLikelihood) ? gen.likelihood as keyof typeof RiskLikelihood : 'Low',
          status: 'Open',
          context: gen.context || eventType,
        };
        risksToSave.push(newRisk);
      }
    });

    onSave(risksToSave as any);
    onClose();
  };

  const applySuggestion = (risk: GeneratedRisk) => {
    setDescription(risk.description);
    setContext(risk.context || eventType);
    if (risk.category in RiskCategory) setCategory(risk.category as keyof typeof RiskCategory);
    if (risk.impact in RiskImpact) setImpact(risk.impact as keyof typeof RiskImpact);
    if (risk.likelihood in RiskLikelihood) setLikelihood(risk.likelihood as keyof typeof RiskLikelihood);
  };

  const handleSave = () => {
    if (!description.trim()) {
      setError('Description cannot be empty.');
      return;
    }
    setError(null);

    const newRisk: RiskItem = {
      id: isEditMode && riskToEdit ? riskToEdit.id : '', // Empty ID for new, existing ID for update
      description,
      context,
      category,
      impact,
      likelihood,
      status,
    };
    onSave(newRisk);
    onClose();
  };

  const renderSelectOptions = (enumObject: object) => {
    return Object.entries(enumObject).map(([key, value]) => (
      <option key={key} value={key}>{value}</option>
    ));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all max-h-[90vh] overflow-y-auto">
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">
              {isReadOnly ? 'Risk Details' : (isEditMode ? 'Edit Risk' : 'Log New Risk')}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
          </div>

          {!isEditMode && !isReadOnly && (
            <div className="bg-base-200 p-4 rounded-lg border border-indigo-500/30">
              <h3 className="text-sm font-bold text-indigo-300 mb-2 flex items-center gap-2">
                <span>✨</span> AI Risk Assistant
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Describe event (e.g., 'Online Donation Campaign')"
                  className="flex-grow p-2 rounded bg-base-100 border border-base-300 text-sm"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                />
                <button
                  onClick={handleGenerateRisks}
                  disabled={isGenerating || !eventType}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : 'Generate'}
                </button>
              </div>

              {generatedRisks.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-gray-400">Suggestions (Select to Add):</p>
                    {selectedRiskIndices.size > 0 && (
                      <button
                        onClick={handleBatchSave}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-xs font-bold"
                      >
                        Add {selectedRiskIndices.size} Selected
                      </button>
                    )}
                  </div>
                  {generatedRisks.map((risk, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-2 bg-base-100 rounded border ${selectedRiskIndices.has(idx) ? 'border-emerald-500 bg-emerald-900/10' : 'border-base-300 hover:border-indigo-500'} cursor-pointer text-xs group transition-colors`}
                      onClick={() => toggleSelection(idx)}
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs checkbox-primary mt-1"
                        checked={selectedRiskIndices.has(idx)}
                        onChange={() => { }}
                      />
                      <div className="flex-grow" onClick={(e) => { e.stopPropagation(); applySuggestion(risk); }}>
                        <div className="font-bold text-white group-hover:text-indigo-300 pointer-events-none">{risk.category} - {risk.impact}</div>
                        <div className="text-gray-300 pointer-events-none">{risk.description}</div>
                        <div className="text-gray-500 mt-1 italic line-clamp-1 pointer-events-none">{risk.reasoning}</div>
                        <div className="text-[10px] text-gray-500 mt-1 hover:text-indigo-400 underline" role="button">Populate Form (Single)</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-base-content">
            {isReadOnly
              ? 'View details for this risk.'
              : (isEditMode ? 'Update the details for the existing risk.' : 'Manually record a new risk identified by your team.')
            }
          </p>
          <div className="space-y-4">
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                id="description"
                rows={3}
                className="w-full p-3 bg-base-200 border border-base-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Describe the potential risk..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isReadOnly}
              />
            </div>
            <div>
              <label htmlFor="context" className="block text-sm font-medium text-gray-300 mb-2">Context / Project</label>
              <input
                id="context"
                type="text"
                className="w-full p-3 bg-base-200 border border-base-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="e.g. Ramadhan Program 2024"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                disabled={isReadOnly}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <select
                  id="category"
                  value={category}
                  onChange={e => setCategory(e.target.value as keyof typeof RiskCategory)}
                  className="w-full p-3 bg-base-200 border border-base-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isReadOnly}
                >
                  {renderSelectOptions(RiskCategory)}
                </select>
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  id="status"
                  value={status}
                  onChange={e => setStatus(e.target.value as keyof typeof RiskStatus)}
                  className="w-full p-3 bg-base-200 border border-base-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isReadOnly}
                >
                  {renderSelectOptions(RiskStatus)}
                </select>
              </div>
              <div>
                <label htmlFor="impact" className="block text-sm font-medium text-gray-300 mb-2">Impact</label>
                <select
                  id="impact"
                  value={impact}
                  onChange={e => setImpact(e.target.value as keyof typeof RiskImpact)}
                  className="w-full p-3 bg-base-200 border border-base-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isReadOnly}
                >
                  {renderSelectOptions(RiskImpact)}
                </select>
              </div>
              <div>
                <label htmlFor="likelihood" className="block text-sm font-medium text-gray-300 mb-2">Likelihood</label>
                <select
                  id="likelihood"
                  value={likelihood}
                  onChange={e => setLikelihood(e.target.value as keyof typeof RiskLikelihood)}
                  className="w-full p-3 bg-base-200 border border-base-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isReadOnly}
                >
                  {renderSelectOptions(RiskLikelihood)}
                </select>
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-error text-center">{error}</p>}
          <div className="flex justify-end gap-4">
            <button onClick={onClose} className="px-6 py-2 rounded-lg bg-base-300 text-white hover:bg-opacity-80 transition">{isReadOnly ? 'Close' : 'Cancel'}</button>
            {!isReadOnly && (
              <button onClick={handleSave} className="px-6 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-opacity-80 transition">Save Risk</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogRiskModal;
