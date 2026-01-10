
import React from 'react';
import { Kpi } from '../types';

const TrendIcon: React.FC<{ trend: 'up' | 'down' | 'stable' }> = ({ trend }) => {
    if (trend === 'up') return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-error" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 1.5a.5.5 0 01.5.5v12.586l3.293-3.293a.5.5 0 11.707.707l-4 4a.5.5 0 01-.707 0l-4-4a.5.5 0 01.707-.707L11 14.586V2a.5.5 0 01.5-.5z" clipRule="evenodd" transform="rotate(180 10 10)"/></svg>;
    if (trend === 'down') return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-success" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.5a.75.75 0 01-1.5 0V3.75A.75.75 0 0110 3zM6.28 8.22a.75.75 0 010 1.06l-2.25 2.25a.75.75 0 11-1.06-1.06l2.25-2.25a.75.75 0 011.06 0zm9.94 1.06a.75.75 0 01-1.06 0l-2.25-2.25a.75.75 0 011.06-1.06l2.25 2.25a.75.75 0 010 1.06z" clipRule="evenodd" transform="rotate(180 12 12)"/></svg>;
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z" clipRule="evenodd" /></svg>;
};


const KpiCard: React.FC<Kpi> = ({ title, value, description, trend }) => {
    return (
        <div className="bg-base-100 p-6 rounded-xl shadow-lg border-l-4 border-primary transform hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-base-content">{title}</p>
                    <p className="text-3xl font-bold text-white mt-1">{value}</p>
                </div>
                <div className="p-2 bg-base-300 rounded-full">
                    <TrendIcon trend={trend} />
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">{description}</p>
        </div>
    );
};

export default KpiCard;
