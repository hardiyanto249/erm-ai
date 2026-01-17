import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, LabelList } from 'recharts';

interface BenchmarkChartProps {
    myRHA: number;
    marketRHA: number;
    myACR: number;
    marketACR: number;
    lazName?: string;
}

const BenchmarkChart: React.FC<BenchmarkChartProps> = ({ myRHA, marketRHA, myACR, marketACR, lazName }) => {

    const data = [
        {
            name: 'Rasio Hak Amil (RHA)',
            MyLaz: parseFloat(myRHA.toFixed(2)),
            MarketAvg: parseFloat(marketRHA.toFixed(2)),
            amt: 25, // max domain hint
        },
        {
            name: 'Saldo Kas (ACR)',
            MyLaz: parseFloat(myACR.toFixed(2)),
            MarketAvg: parseFloat(marketACR.toFixed(2)),
            amt: 25,
        },
    ];

    return (
        <div className="h-80 flex flex-col bg-base-100 p-6 rounded-xl shadow-lg mt-6">
            <h3 className="text-xl font-semibold text-white mb-2">Industry Benchmark Comparison</h3>
            <p className="text-xs text-gray-400 mb-4">Comparing your performance against the average of all other LAZs.</p>

            <div className="flex-grow min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} horizontal={false} />
                        <XAxis type="number" stroke="#a6adbb" domain={[0, 'auto']} />
                        <YAxis type="category" dataKey="name" stroke="#a6adbb" width={120} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                        <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{ backgroundColor: '#191e24', borderColor: '#15191e', color: '#a6adbb' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />

                        {/* My LAZ */}
                        <Bar dataKey="MyLaz" name={lazName || "My LAZ"} fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                            <LabelList dataKey="MyLaz" position="right" fill="#3b82f6" fontSize={12} formatter={(val: number) => `${val}%`} />
                        </Bar>

                        {/* Market Avg */}
                        <Bar dataKey="MarketAvg" name="Industry Avg" fill="#9ca3af" radius={[0, 4, 4, 0]} barSize={20}>
                            <LabelList dataKey="MarketAvg" position="right" fill="#9ca3af" fontSize={12} formatter={(val: number) => `${val}%`} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default BenchmarkChart;
