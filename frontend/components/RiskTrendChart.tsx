import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, ReferenceLine } from 'recharts';
import { getAuthToken } from '../utils/auth';

const RiskTrendChart: React.FC = () => {
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = getAuthToken();
                const res = await fetch('http://localhost:8080/api/analytics/trends', {
                    headers: { 'X-LAZ-Token': token || '' }
                });
                if (res.ok) {
                    const result = await res.json();
                    // Take last 10 data points
                    const sliced = result.slice(-10);
                    setData(sliced);
                }
            } catch (err) {
                console.error("Failed to fetch trends", err);
            }
        };
        fetchData();
    }, []);

    // Helper for Reference Line Label
    const renderLabel = (props: any, text: string) => {
        const { viewBox } = props;
        return (
            <text x={viewBox.width - 10} y={viewBox.y - 10} fill="red" textAnchor="end" fontSize={12}>
                {text}
            </text>
        );
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-base-100 p-4 rounded-xl shadow-lg border border-base-200">
            {/* RHA Chart */}
            <div className="h-64 flex flex-col">
                <h3 className="text-lg font-semibold text-white mb-2 ml-2">RHA Trend (Last 10)</h3>
                <div className="flex-grow min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                            <XAxis dataKey="date" stroke="#a6adbb" tick={{ fontSize: 10 }} minTickGap={10}
                                tickFormatter={(v) => {
                                    // Format YYYY-MM-DD to MM/YY?
                                    // Assuming v is YYYY-MM-DD
                                    return v.substring(2); // YY-MM-DD -> 24-12-12
                                }}
                            />
                            <YAxis stroke="#a6adbb" allowDecimals={true} width={30} domain={[0, 'auto']} />
                            <Tooltip contentStyle={{ backgroundColor: '#191e24', borderColor: '#15191e', color: '#a6adbb' }} />
                            <ReferenceLine y={12.5} stroke="red" strokeDasharray="3 3" label="Max 12.5%" />
                            <Line type="monotone" dataKey="RHA" name="RHA (%)" stroke="#f87171" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ACR Chart */}
            <div className="h-64 flex flex-col">
                <h3 className="text-lg font-semibold text-white mb-2 ml-2">ACR Trend (Last 10)</h3>
                <div className="flex-grow min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                            <XAxis dataKey="date" stroke="#a6adbb" tick={{ fontSize: 10 }} minTickGap={10}
                                tickFormatter={(v) => v.substring(2)} />
                            <YAxis stroke="#a6adbb" allowDecimals={true} width={30} domain={[0, 'auto']} />
                            <Tooltip contentStyle={{ backgroundColor: '#191e24', borderColor: '#15191e', color: '#a6adbb' }} />
                            <ReferenceLine y={10} stroke="red" strokeDasharray="3 3" label="Max 10%" />
                            <Line type="monotone" dataKey="ACR" name="ACR (%)" stroke="#fbbf24" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default RiskTrendChart;