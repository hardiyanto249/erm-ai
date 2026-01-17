import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/auth';
import { API_BASE_URL } from '../utils/config';

interface LazPartner {
    id: number;
    name: string;
    scale: string;
    description: string;
    is_active: boolean;
}

const Configuration: React.FC = () => {
    const [lazs, setLazs] = useState<LazPartner[]>([]);
    const [loading, setLoading] = useState(true);

    const [rhaLimit, setRhaLimit] = useState("");
    const [acrLimit, setAcrLimit] = useState("");

    useEffect(() => {
        fetchLazs();
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await authFetch(`${API_BASE_URL}/api/config`);
            if (res.ok) {
                const data = await res.json();
                if (data.rha_limit) setRhaLimit(data.rha_limit);
                if (data.acr_limit) setAcrLimit(data.acr_limit);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const saveConfig = async () => {
        try {
            const res = await authFetch(`${API_BASE_URL}/api/admin/config/update`, {
                method: 'POST',
                body: JSON.stringify({ rha_limit: rhaLimit, acr_limit: acrLimit })
            });
            if (res.ok) {
                alert("Configuration saved successfully");
            } else {
                alert("Failed to save configuration");
            }
        } catch (error) {
            console.error(error);
            alert("Error saving configuration");
        }
    };

    const fetchLazs = async () => {
        try {
            const res = await authFetch(`${API_BASE_URL}/api/admin/lazs`);
            if (res.ok) {
                const data = await res.json();
                setLazs(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id: number, currentStatus: boolean) => {
        // Optimistic update
        const newStatus = !currentStatus;

        try {
            const res = await authFetch(`${API_BASE_URL}/api/lazs/toggle-status`, {
                method: 'POST',
                body: JSON.stringify({ laz_id: id, is_active: newStatus })
            });
            if (res.ok) {
                setLazs(prev => prev.map(laz =>
                    laz.id === id ? { ...laz, is_active: newStatus } : laz
                ));
            } else {
                alert("Failed to update status");
                // Revert if failed (optional, but good practice)
                fetchLazs();
            }
        } catch (error) {
            console.error(error);
            alert("Error updating status");
        }
    };

    if (loading) return <div className="p-8 text-center text-white">Loading configuration...</div>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Konfigurasi Sistem</h1>
            </div>

            {/* Threshold Configuration */}
            <div className="bg-base-100 p-6 rounded-xl shadow-lg border border-base-content/10">
                <h2 className="text-xl font-bold mb-4 text-white">Indikator Ideal (Thresholds)</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Batas Maksimal RHA (%)</span>
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            className="input input-bordered w-full"
                            value={rhaLimit}
                            onChange={(e) => setRhaLimit(e.target.value)}
                        />
                        <label className="label">
                            <span className="label-text-alt text-gray-400">Default: 12.5%</span>
                        </label>
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Batas Maksimal ACR (%)</span>
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            className="input input-bordered w-full"
                            value={acrLimit}
                            onChange={(e) => setAcrLimit(e.target.value)}
                        />
                        <label className="label">
                            <span className="label-text-alt text-gray-400">Default: 10%</span>
                        </label>
                    </div>
                    <div>
                        <button className="btn btn-primary w-full" onClick={saveConfig}>
                            Simpan Konfigurasi
                        </button>
                    </div>
                </div>
            </div>

            <div className="divider"></div>

            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Manajemen LAZ</h2>
            </div>

            <p className="text-gray-400">Manage registered LAZs. Disabled LAZs cannot login and are excluded from analytics.</p>
            <div className="bg-base-100 p-6 rounded-xl shadow-lg border border-base-content/10">
                <div className="overflow-x-auto">
                    <table className="table w-full text-base-content">
                        <thead>
                            <tr className="text-gray-400 border-b border-base-content/20">
                                <th>ID</th>
                                <th>Name</th>
                                <th>Scale</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lazs.map(laz => (
                                <tr key={laz.id} className="hover:bg-base-200/50 border-b border-base-content/10">
                                    <td className="font-mono text-sm opacity-50">{laz.id}</td>
                                    <td className="font-bold">{laz.name}</td>
                                    <td>{laz.scale}</td>
                                    <td>
                                        <div className={`badge gap-2 ${laz.is_active ? 'badge-success badge-outline' : 'badge-error badge-outline'}`}>
                                            <div className={`w-2 h-2 rounded-full ${laz.is_active ? 'bg-success' : 'bg-error'}`}></div>
                                            {laz.is_active ? 'Active' : 'Disabled'}
                                        </div>
                                    </td>
                                    <td>
                                        <button
                                            className={`btn btn-sm btn-outline ${laz.is_active ? 'btn-error' : 'btn-success'}`}
                                            onClick={() => toggleStatus(laz.id, laz.is_active)}
                                        >
                                            {laz.is_active ? 'Disable' : 'Enable'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Configuration;
