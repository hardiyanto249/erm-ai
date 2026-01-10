import React, { useState, useEffect } from 'react';
import ComplianceChecklist from './ComplianceChecklist';
import AddComplianceItemModal from './AddComplianceItemModal';
import { ComplianceItem } from '../types';
import { authFetch } from '../utils/auth';

const ShariaCompliance: React.FC<{ lazId: number }> = ({ lazId }) => {
    const [items, setItems] = useState<ComplianceItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        authFetch(`http://localhost:8080/api/compliance`)
            .then(res => res.json())
            .then(data => setItems(data || []))
            .catch(err => console.error(err));
    }, [lazId]);

    const handleToggleItem = async (id: string) => {
        try {
            const res = await authFetch(`http://localhost:8080/api/compliance?id=${id}`, { method: 'PUT' });
            if (res.ok) {
                setItems(items.map(item =>
                    item.id === id ? { ...item, completed: !item.completed } : item
                ));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddItem = async (text: string) => {
        const newItem: ComplianceItem = {
            id: `sc-${Date.now()}`,
            text,
            completed: false,
        };
        try {
            const res = await authFetch(`http://localhost:8080/api/compliance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            });
            if (res.ok) {
                setItems(prevItems => [...prevItems, newItem]);
                setIsModalOpen(false);
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-wrap gap-4 justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Sharia Compliance Monitoring</h1>
                        <p className="mt-2 text-base-content max-w-3xl">
                            Ensuring all operations, contracts, and instruments align with the principles and fatwas established by the Sharia Supervisory Board (Dewan Pengawas Syariah - DPS).
                        </p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-opacity-80 transition-colors flex-shrink-0"
                    >
                        Add New Item
                    </button>
                </div>
                <div className="bg-base-100 p-6 rounded-xl shadow-lg">
                    <ComplianceChecklist items={items} onToggleItem={handleToggleItem} />
                </div>
            </div>
            {isModalOpen && (
                <AddComplianceItemModal
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleAddItem}
                />
            )}
        </>
    );
};

export default ShariaCompliance;