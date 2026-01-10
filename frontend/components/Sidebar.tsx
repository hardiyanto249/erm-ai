
import React from 'react';

const DashboardIcon = () => (
  <svg xmlns="http://www.w.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
);

const RiskIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

const ComplianceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

const TrackingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);


interface SidebarProps {
  activeView: string;
  setActiveView: (view: 'dashboard' | 'risks' | 'compliance' | 'zis-tracking') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const navItems = [
    { id: 'dashboard', icon: <DashboardIcon />, label: 'Dashboard' },
    { id: 'risks', icon: <RiskIcon />, label: 'Risk Management' },
    // { id: 'compliance', icon: <ComplianceIcon />, label: 'Sharia Compliance' },
    // { id: 'zis-tracking', icon: <TrackingIcon />, label: 'ZIS Tracking' },
  ];

  return (
    <aside className="w-20 md:w-64 bg-base-100 text-base-content flex flex-col">
      <div className="flex items-center justify-center h-20 border-b border-base-300">
        <h1 className="text-xl md:text-2xl font-bold text-white hidden md:block">ERM Syariah</h1>
        <div className="md:hidden text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.789-2.75 9.566-1.74 2.777-2.75 5.434-2.75 5.434h11c0 0-1.01-2.657-2.75-5.434C13.009 17.789 12 14.517 12 11z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-2.345.384-4.618 1.116-6.733a12.028 12.028 0 012.793-4.402 12.028 12.028 0 00-13.818 4.402C2.384 6.382 2 8.655 2 11c0 3.517 1.009 6.789 2.75 9.566" />
          </svg>
        </div>
      </div>
      <nav className="flex-1 px-2 md:px-4 py-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id as 'dashboard' | 'risks' | 'compliance' | 'zis-tracking')}
            className={`flex items-center w-full p-3 rounded-lg transition-colors duration-200 ${activeView === item.id
                ? 'bg-primary text-white'
                : 'hover:bg-base-300'
              }`}
          >
            {item.icon}
            <span className="ml-4 font-semibold hidden md:block">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-base-300">
        <p className="text-xs text-center text-gray-500 hidden md:block">
          Perancangan Konseptual Aplikasi ERM
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
