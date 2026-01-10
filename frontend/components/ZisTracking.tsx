import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, CartesianGrid, XAxis, YAxis, Bar } from 'recharts';

// --- Reusable Components ---
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-base-100 p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
        {children}
    </div>
);

const KpiCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-base-200 p-4 rounded-lg flex items-center gap-4">
        <div className="p-3 bg-primary/20 text-primary rounded-full">{icon}</div>
        <div>
            <p className="text-sm text-base-content">{title}</p>
            <p className="text-xl font-bold text-white">{value}</p>
        </div>
    </div>
);

// --- Icons ---
const CollectionIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const DonorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.122-1.274-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.122-1.274.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const ManagementIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const DistributionIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const BeneficiaryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-2a6 6 0 00-12 0v2" /></svg>;

import { authFetch } from '../utils/auth';

const ZisTracking: React.FC<{ lazId: number }> = ({ lazId }) => {
    const [summary, setSummary] = useState<any>(null);
    const [collectionData, setCollectionData] = useState<any[]>([]);
    const [distributionData, setDistributionData] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await authFetch(`http://localhost:8080/api/zis`);
                if (res.ok) {
                    const data = await res.json();
                    setSummary(data.summary || {}); // Handle possible null summary
                    if (data.collection) {
                        setCollectionData(data.collection.map((c: any) => ({ name: c.category, value: c.value })));
                    } else {
                        setCollectionData([]);
                    }
                    if (data.distribution) {
                        setDistributionData(data.distribution.map((d: any) => ({ name: d.ashnaf, Saldo: d.amount })));
                    } else {
                        setDistributionData([]);
                    }
                }
            } catch (err) {
                console.error("Error fetching ZIS data:", err);
            }
        };

        fetchData();
    }, [lazId]);

    const COLORS = ['#36d399', '#3abff8', '#fbbd23', '#a6adbb'];
    const formatCurrency = (value: number) => `Rp ${new Intl.NumberFormat('id-ID').format(value || 0)}`;

    // Derived values from summary
    const totalCollected = summary?.total_collected || 0;
    const totalDistributed = summary?.total_distributed || 0;
    const muzakkiCount = summary?.muzakki_count || 0;
    const mustahikCount = summary?.mustahik_count || 0;
    const managedFunds = totalCollected - totalDistributed;
    const operationalEfficiency = totalCollected > 0 ? ((summary?.operational_funds || 0) / totalCollected * 100).toFixed(2) : "0";
    const productiveFunds = summary?.productive_funds || 0;
    const programReach = summary?.program_reach || 0;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white">Monitoring & Tracking ZIS</h1>
                <p className="mt-2 text-base-content max-w-3xl">
                    Overview of the Zakat, Infaq, and Sadaqah fund lifecycle from collection to distribution.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- PENGHIMPUNAN --- */}
                <div className="lg:col-span-1 space-y-6">
                    <Section title="Penghimpunan (Collection)">
                        <div className="space-y-4">
                            <KpiCard title="Total Dana Terhimpun" value={formatCurrency(totalCollected)} icon={<CollectionIcon />} />
                            <KpiCard title="Jumlah Muzakki" value={muzakkiCount.toLocaleString()} icon={<DonorIcon />} />
                            <KpiCard title="Rata-rata Donasi" value={muzakkiCount > 0 ? formatCurrency(totalCollected / muzakkiCount) : "Rp 0"} icon={<CollectionIcon />} />
                        </div>
                        <div className="h-64 mt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={collectionData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" nameKey="name">
                                        {collectionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Section>
                </div>

                {/* --- PENGELOLAAN & PENDISTRIBUSIAN --- */}
                <div className="lg:col-span-2 space-y-8">
                    {/* --- PENGELOLAAN --- */}
                    <Section title="Pengelolaan (Management)">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <KpiCard title="Dana Kelolaan Saat Ini" value={formatCurrency(managedFunds)} icon={<ManagementIcon />} />
                            <KpiCard title="Efisiensi Operasional" value={`${operationalEfficiency}%`} icon={<ManagementIcon />} />
                            <KpiCard title="Dana Produktif" value={formatCurrency(productiveFunds)} icon={<ManagementIcon />} />
                        </div>
                    </Section>

                    {/* --- PENDISTRIBUSIAN --- */}
                    <Section title="Pendistribusian (Distribution)">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <KpiCard title="Total Dana Tersalurkan" value={formatCurrency(totalDistributed)} icon={<DistributionIcon />} />
                            <KpiCard title="Jumlah Mustahik" value={mustahikCount.toLocaleString()} icon={<BeneficiaryIcon />} />
                            <KpiCard title="Jangkauan Program" value={`${programReach} Provinsi`} icon={<DistributionIcon />} />
                        </div>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={distributionData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                                    <XAxis type="number" stroke="#a6adbb" tickFormatter={(value) => `${value / 1000000} Jt`} />
                                    <YAxis type="category" dataKey="name" stroke="#a6adbb" width={80} tick={{ fontSize: 12 }} />
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }} />
                                    <Bar dataKey="Saldo" fill="#36d399" name="Disalurkan" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Section>
                </div>
            </div>
        </div>
    );
};

export default ZisTracking;
