import React, { useState } from 'react';
import { RiskItem } from '../types';

interface MitigationModalProps {
    risk: RiskItem;
    onClose: () => void;
    onSave: (updatedRisk: RiskItem) => void;
}

const MitigationModal: React.FC<MitigationModalProps> = ({ risk, onClose, onSave }) => {
    const [plan, setPlan] = useState(risk.mitigation_plan || '');
    const [status, setStatus] = useState(risk.mitigation_status || 'Planned');
    const [progress, setProgress] = useState(risk.mitigation_progress || 0);

    const handleSave = () => {
        const updatedRisk: RiskItem = {
            ...risk,
            mitigation_plan: plan,
            mitigation_status: status,
            mitigation_progress: progress,
        };
        onSave(updatedRisk);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg transform transition-all">
                <div className="p-6 space-y-4">
                    <h3 className="text-xl font-bold text-white">Manage Mitigation</h3>
                    <div className="text-sm text-gray-400">Risk ID: {risk.id}</div>
                    <div className="bg-base-200 p-3 rounded mb-4">
                        <p className="text-xs font-bold text-indigo-300 uppercase">Risk Description</p>
                        <p className="text-sm text-gray-300">{risk.description}</p>
                        {risk.context && (
                            <>
                                <p className="text-xs font-bold text-indigo-300 uppercase mt-2">Context / Project</p>
                                <p className="text-sm text-gray-300">{risk.context}</p>
                            </>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Mitigation Plan</label>
                        <textarea
                            rows={4}
                            className="w-full p-2 bg-base-200 border border-base-300 rounded text-sm focus:border-primary"
                            placeholder="Describe action steps..."
                            value={plan}
                            onChange={(e) => setPlan(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full p-2 bg-base-200 border border-base-300 rounded text-sm"
                            >
                                <option value="Planned">Planned</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="On Hold">On Hold</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Progress ({progress}%)</label>
                            <input
                                type="range"
                                min="0" max="100"
                                value={progress}
                                onChange={(e) => setProgress(Number(e.target.value))}
                                className="range range-primary range-xs"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <button onClick={onClose} className="px-4 py-2 rounded bg-base-300 text-white text-sm">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 rounded bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700">Update Mitigation</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MitigationModal;
