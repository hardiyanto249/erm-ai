import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

interface ChartData {
    name: string;
    Open?: number;
    Mitigated?: number;
    Monitoring?: number;
    Closed?: number;
}

interface RiskCategoryChartProps {
    data: ChartData[];
}

const statusColors = {
    Open: '#f87272',       // error
    Monitoring: '#fbbd23',  // warning
    Mitigated: '#36d399',   // success
    Closed: '#a6adbb',      // base-content
};


const RiskCategoryChart: React.FC<RiskCategoryChartProps> = ({ data }) => {
    return (
        <div className="h-80 flex flex-col">
            <h3 className="text-xl font-semibold text-white mb-4">Risk Distribution by Category & Status</h3>
            <div className="flex-grow min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                        <XAxis dataKey="name" stroke="#a6adbb" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#a6adbb" allowDecimals={false} width={40} />
                        <Tooltip
                            cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }}
                            contentStyle={{
                                backgroundColor: '#191e24',
                                borderColor: '#15191e',
                                borderRadius: '0.5rem',
                                color: '#a6adbb'
                            }}
                        />
                        <Legend wrapperStyle={{ fontSize: '14px' }} />
                        <Bar dataKey="Open" stackId="a" fill={statusColors.Open} name="Open" />
                        <Bar dataKey="Monitoring" stackId="a" fill={statusColors.Monitoring} name="Monitoring" />
                        <Bar dataKey="Mitigated" stackId="a" fill={statusColors.Mitigated} name="Mitigated" />
                        <Bar dataKey="Closed" stackId="a" fill={statusColors.Closed} name="Closed" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default RiskCategoryChart;
