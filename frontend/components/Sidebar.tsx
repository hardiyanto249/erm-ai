
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

const ConfigurationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);


const PredictionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

interface SidebarProps {
  activeView: string;
  setActiveView: (view: any) => void;
  userRole?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, userRole }) => {
  const navItems = [
    { id: 'dashboard', icon: <DashboardIcon />, label: 'Dashboard' },
    { id: 'risks', icon: <RiskIcon />, label: 'Risk Management' },
    { id: 'prediction', icon: <PredictionIcon />, label: 'AI Prediction' },
    // { id: 'compliance', icon: <ComplianceIcon />, label: 'Sharia Compliance' },
    // { id: 'zis-tracking', icon: <TrackingIcon />, label: 'ZIS Tracking' },
  ];

  if (userRole === 'Admin') {
    navItems.push({ id: 'configuration', icon: <ConfigurationIcon />, label: 'Konfigurasi' });
  }

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
