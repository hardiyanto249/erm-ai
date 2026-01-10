import React, { useMemo } from 'react';
import { RiskItem, RiskImpact, RiskLikelihood } from '../types';

interface RiskMatrixProps {
    risks: RiskItem[];
}

// Define the order of levels for the matrix axes, from highest to lowest impact
const impactLevels: (keyof typeof RiskImpact)[] = ['Critical', 'High', 'Medium', 'Low'];
// Define the order of levels for the matrix axes, from lowest to highest likelihood
const likelihoodLevels: (keyof typeof RiskLikelihood)[] = ['Low', 'Medium', 'High'];

// Function to determine the risk level and corresponding color based on impact and likelihood
const getCellConfig = (impact: keyof typeof RiskImpact, likelihood: keyof typeof RiskLikelihood): { color: string; label: string } => {
    // Red for severe risks (highest impact/likelihood combinations)
    if ((impact === 'Critical' && likelihood === 'High') || (impact === 'Critical' && likelihood === 'Medium') || (impact === 'High' && likelihood === 'High')) {
        return { color: 'bg-red-700/80 hover:bg-red-600/80 border-red-600/50', label: 'Severe' };
    }
    // Orange for high risks
    if ((impact === 'Critical' && likelihood === 'Low') || (impact === 'High' && likelihood === 'Medium') || (impact === 'Medium' && likelihood === 'High')) {
        return { color: 'bg-orange-600/80 hover:bg-orange-500/80 border-orange-500/50', label: 'High' };
    }
    // Yellow for moderate risks
    if ((impact === 'High' && likelihood === 'Low') || (impact === 'Medium' && likelihood === 'Medium')) {
        return { color: 'bg-yellow-500/80 hover:bg-yellow-400/80 border-yellow-400/50', label: 'Moderate' };
    }
    // Lighter Green for low risks
    if ((impact === 'Medium' && likelihood === 'Low') || (impact === 'Low' && likelihood === 'High') || (impact === 'Low' && likelihood === 'Medium')) {
        return { color: 'bg-green-600/70 hover:bg-green-500/70 border-green-500/50', label: 'Low' };
    }
    // Darker Green for minor risks (lowest impact and likelihood)
    if (impact === 'Low' && likelihood === 'Low') {
        return { color: 'bg-green-800/70 hover:bg-green-700/70 border-green-700/50', label: 'Minor' };
    }
    // Default fallback color
    return { color: 'bg-base-300 hover:bg-base-200', label: 'Unknown' };
};


const RiskMatrix: React.FC<RiskMatrixProps> = ({ risks }) => {

    const matrixData = useMemo(() => {
        const grid: { [impact: string]: { [likelihood: string]: RiskItem[] } } = {};
        
        impactLevels.forEach(impact => {
            grid[impact] = {};
            likelihoodLevels.forEach(likelihood => {
                grid[impact][likelihood] = [];
            });
        });

        risks.forEach(risk => {
            // Ensure the risk's impact and likelihood are valid keys before assigning
            if (grid[risk.impact] && grid[risk.impact][risk.likelihood]) {
                grid[risk.impact][risk.likelihood].push(risk);
            }
        });
        return grid;
    }, [risks]);


    return (
        <div className="relative pt-8 pl-8 pb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Risk Matrix (Impact vs. Likelihood)</h3>
            <p className="text-sm text-base-content mb-6">
                Visual representation of the current risk landscape. Each cell shows the number of risks for a given combination.
            </p>
            <div className="grid grid-cols-[auto_1fr_1fr_1fr] grid-rows-[auto_1fr_1fr_1fr_1fr] gap-1.5 bg-base-200 rounded-lg p-2">
                {/* Top-left empty cell */}
                <div />

                {/* Likelihood labels (X-axis) */}
                {likelihoodLevels.map(level => (
                    <div key={level} className="text-center font-bold text-base-content py-2">{level}</div>
                ))}

                {/* Impact labels (Y-axis) and Matrix Cells */}
                {impactLevels.map(impactLevel => (
                    <React.Fragment key={impactLevel}>
                        <div className="flex items-center justify-end font-bold text-base-content px-3 text-right">{impactLevel}</div>
                        {likelihoodLevels.map(likelihoodLevel => {
                             const cellRisks = matrixData[impactLevel][likelihoodLevel];
                             const cellConfig = getCellConfig(impactLevel, likelihoodLevel);
                             const tooltipText = cellRisks.length > 0
                                ? `Risks (${cellRisks.length}):\n${cellRisks.map(r => `- ${r.description}`).join('\n')}`
                                : `No risks for ${impactLevel} Impact / ${likelihoodLevel} Likelihood`;
                            
                            return (
                                <div
                                    key={`${impactLevel}-${likelihoodLevel}`}
                                    title={tooltipText}
                                    aria-label={tooltipText}
                                    className={`aspect-square rounded-md flex items-center justify-center transition-colors duration-200 border cursor-pointer ${cellConfig.color}`}
                                >
                                    <span className="text-3xl font-extrabold text-white" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.5)'}}>
                                        {cellRisks.length > 0 ? cellRisks.length : ''}
                                    </span>
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-lg font-bold text-white">
                <span>Likelihood</span>
            </div>
            <div className="absolute top-1/2 -left-4 -translate-y-1/2 -rotate-90 text-lg font-bold text-white">
                 <span>Impact</span>
            </div>
        </div>
    );
};

export default RiskMatrix;
