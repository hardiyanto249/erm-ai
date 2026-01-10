
import React from 'react';
import { ComplianceItem } from '../types';

interface ComplianceChecklistProps {
    items: ComplianceItem[];
    onToggleItem: (id: string) => void;
}

const ComplianceChecklist: React.FC<ComplianceChecklistProps> = ({ items, onToggleItem }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white mb-4">Compliance Verification Checklist</h3>
            {items.map(item => (
                <div
                    key={item.id}
                    onClick={() => onToggleItem(item.id)}
                    className="flex items-center p-4 bg-base-200 rounded-lg cursor-pointer hover:bg-base-300 transition-colors"
                >
                    <div className={`w-6 h-6 rounded-md flex-shrink-0 mr-4 flex items-center justify-center ${item.completed ? 'bg-primary' : 'bg-base-100 border-2 border-base-content'}`}>
                        {item.completed && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>
                    <span className={`flex-grow ${item.completed ? 'line-through text-gray-500' : 'text-base-content'}`}>
                        {item.text}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default ComplianceChecklist;