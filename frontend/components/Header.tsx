import React from 'react';
import { LazPartner } from '../types';

interface HeaderProps {
  lazName: string;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ lazName, onLogout }) => {
  return (
    <header className="flex items-center justify-between h-20 px-6 bg-base-100 border-b border-base-300">
      <h2 className="text-2xl font-semibold text-white">Risk Management Dashboard</h2>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="text-sm font-medium text-base-content/70">Logged in as:</span>
          <span className="text-sm font-bold text-accent">{lazName}</span>
        </div>
        <button className="btn btn-sm btn-outline btn-error" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
