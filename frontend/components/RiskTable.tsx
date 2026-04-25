import React from 'react';
import { RiskItem, getCategoryDisplayName } from '../types';

interface RiskTableProps {
  risks: RiskItem[];
  isCompact?: boolean;
  onEdit?: (risk: RiskItem) => void;
  onDelete?: (riskId: string) => void;
  onMitigate?: (risk: RiskItem) => void;
  isReadOnly?: boolean;
}

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
);

const ViewIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const getImpactColor = (impact: string) => {
  switch (impact) {
    case 'Critical': return 'bg-red-500/20 text-red-400 border border-red-500/30';
    case 'High': return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    case 'Medium': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    case 'Low': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    default: return 'bg-gray-500/20 text-gray-400';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Open': return 'bg-red-500';
    case 'Monitoring': return 'bg-yellow-500';
    case 'Mitigated': return 'bg-green-500';
    case 'Closed': return 'bg-gray-500';
    default: return 'bg-gray-700';
  }
}

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
);

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
);

const RiskTable: React.FC<RiskTableProps> = ({ risks, isCompact = false, onEdit, onDelete, onMitigate, isReadOnly }) => {
  const hasActions = !!(onEdit && onDelete) || !!(isReadOnly && onEdit);
  const [sortConfig, setSortConfig] = React.useState<{ key: keyof RiskItem; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' }); // Default sort by newest

  const sortedRisks = React.useMemo(() => {
    let sortableRisks = [...risks];
    if (sortConfig !== null) {
      sortableRisks.sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';

        if (valA < valB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableRisks;
  }, [risks, sortConfig]);

  const requestSort = (key: keyof RiskItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof RiskItem) => {
    if (!sortConfig || sortConfig.key !== key) return <span className="text-gray-600 ml-1">⇅</span>;
    return sortConfig.direction === 'asc' ? <span className="ml-1 text-primary">↑</span> : <span className="ml-1 text-primary">↓</span>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-base-content">
        <thead className="text-xs text-gray-400 uppercase bg-base-300">
          <tr>
            {!isCompact && (
              <th scope="col" className="px-6 py-3 cursor-pointer hover:text-white" onClick={() => requestSort('id')}>
                ID {getSortIcon('id')}
              </th>
            )}
            {!isCompact && (
              <th scope="col" className="px-6 py-3 cursor-pointer hover:text-white" onClick={() => requestSort('created_at')}>
                Date {getSortIcon('created_at')}
              </th>
            )}
            <th scope="col" className="px-6 py-3">Description</th>
            <th scope="col" className="px-6 py-3" onClick={() => requestSort('context')}>Context {getSortIcon('context')}</th>
            {!isCompact && <th scope="col" className="px-6 py-3">Category</th>}
            <th scope="col" className="px-6 py-3">Impact</th>
            {!isCompact && <th scope="col" className="px-6 py-3">Likelihood</th>}
            {!isCompact && <th scope="col" className="px-6 py-3">Mitigation</th>}
            <th scope="col" className="px-6 py-3 text-center">Integritas AI</th>
            <th scope="col" className="px-6 py-3">Status</th>
            {!isCompact && hasActions && <th scope="col" className="px-6 py-3 text-center">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {sortedRisks.length === 0 ? (
            <tr>
              <td colSpan={isCompact ? 4 : (hasActions ? 11 : 10)} className="text-center py-8 text-gray-500">No risks to display.</td>
            </tr>
          ) : (
            sortedRisks.map((risk) => (
              <tr key={risk.id} className="bg-base-100 border-b border-base-300 hover:bg-base-200">
                {!isCompact && <td className="px-6 py-4 font-medium text-gray-300 whitespace-nowrap">{risk.id}</td>}
                {!isCompact && <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">{risk.created_at || '-'}</td>}
                <td className="px-6 py-4 max-w-xs truncate" title={risk.description}>{risk.description}</td>
                <td className="px-6 py-4 text-xs text-gray-400">{risk.context || '-'}</td>
                {!isCompact && <td className="px-6 py-4">{getCategoryDisplayName(risk.category)}</td>}
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getImpactColor(risk.impact)}`}>
                    {risk.impact}
                  </span>
                </td>
                {!isCompact && <td className="px-6 py-4">{risk.likelihood}</td>}
                {!isCompact && (
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 w-24">
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>{risk.mitigation_status || 'Planned'}</span>
                        <span>{risk.mitigation_progress || 0}%</span>
                      </div>
                      <progress className="progress progress-primary w-24 h-1.5" value={risk.mitigation_progress || 0} max="100"></progress>
                    </div>
                  </td>
                )}
                <td className="px-6 py-4">
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-[10px] text-gray-500 font-mono">
                      {(risk.confidence_score ? (risk.confidence_score * 100).toFixed(0) : '0')}% Confidence
                    </div>
                    <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          (risk.confidence_score || 0) > 0.85 ? 'bg-blue-500' : 'bg-orange-500 animate-pulse'
                        }`}
                        style={{ width: `${(risk.confidence_score || 0) * 100}%` }}
                      ></div>
                    </div>
                    {risk.status === 'ESC_REQUIRED' && (
                      <span className="mt-1 px-1.5 py-0.5 bg-orange-500/20 text-orange-500 border border-orange-500/30 text-[9px] rounded font-bold">🚨 ESKALASI</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className={`h-2.5 w-2.5 rounded-full ${getStatusColor(risk.status)} mr-2`}></div>
                    {risk.status === 'ESC_REQUIRED' ? 'Butuh Review' : risk.status}
                  </div>
                </td>
                {!isCompact && hasActions && (
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center space-x-2">
                      {!isReadOnly && onMitigate && (
                        <button onClick={() => onMitigate(risk)} className="p-2 text-emerald-400 hover:bg-base-300 rounded-full transition-colors" aria-label="Mitigation Tracking"><ShieldIcon /></button>
                      )}

                      {onEdit && (
                        <button
                          onClick={() => onEdit(risk)}
                          className={`p-2 rounded-full transition-colors ${isReadOnly ? 'text-blue-400 hover:bg-base-300' : 'text-yellow-400 hover:bg-base-300'}`}
                          aria-label={isReadOnly ? "View Details" : "Edit Risk"}
                        >
                          {isReadOnly ? <ViewIcon /> : <EditIcon />}
                        </button>
                      )}

                      {!isReadOnly && onDelete && (
                        <button onClick={() => onDelete(risk.id)} className="p-2 text-red-400 hover:bg-base-300 rounded-full transition-colors" aria-label="Delete Risk"><DeleteIcon /></button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default RiskTable;
