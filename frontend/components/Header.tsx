import React, { useEffect, useState } from 'react';
import { LazPartner } from '../types';
import { API_BASE_URL } from '../utils/config';

interface HeaderProps {
  lazName: string;
  role?: string;
  onLogout: () => void;
  selectedLazId?: number;
  onLazSelect?: (id: number) => void;
}

const Header: React.FC<HeaderProps> = ({ lazName, role, onLogout, selectedLazId, onLazSelect }) => {
  const [lazList, setLazList] = useState<LazPartner[]>([]);

  useEffect(() => {
    if (role === 'Admin') {
      fetch(`${API_BASE_URL}/api/lazs`)
        .then(res => res.json())
        .then(data => setLazList(data || []))
        .catch(err => console.error("Failed to fetch LAZs", err));
    }
  }, [role]);

  return (
    <header className="flex items-center justify-between h-20 px-6 bg-base-100 border-b border-base-300">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-semibold text-white">Risk Management</h2>
        {role === 'Admin' && (
          <div className="badge badge-warning gap-1 font-bold">
            ADMIN MODE
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {role === 'Admin' && onLazSelect ? (
          <div className="form-control w-full max-w-xs">
            <select
              className="select select-bordered select-sm w-full max-w-xs text-gray-900 bg-white"
              value={selectedLazId || 0}
              onChange={(e) => onLazSelect(parseInt(e.target.value))}
            >
              <option value={0} className="text-gray-900 bg-white">Select LAZ to View</option>
              {lazList.map(laz => (
                <option key={laz.id} value={laz.id} className="text-gray-900 bg-white">{laz.name} ({laz.scale})</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="form-control w-full max-w-xs">
            <select
              className="select select-bordered select-sm w-full max-w-xs font-bold text-gray-800 bg-gray-300 cursor-not-allowed disabled:text-gray-800 disabled:bg-gray-300 disabled:opacity-100"
              disabled
              value="current"
            >
              <option value="current" className="text-gray-800">
                {lazName}
              </option>
            </select>
          </div>
        )}

        <button className="btn btn-sm btn-outline btn-error" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
