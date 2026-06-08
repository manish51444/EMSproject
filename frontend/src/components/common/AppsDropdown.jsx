import { useState, useRef, useEffect } from 'react';
import { Grid, X, Settings } from 'lucide-react';

const AppsDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const yourApps = [
    { name: 'Atlassian Home', icon: 'A', color: 'bg-blue-600' },
    { name: 'EMS', icon: 'P', color: 'bg-primary-600' },
    { name: 'Administrations', icon: '⚙', color: 'bg-gray-600' },
  ];

  const recommended = [
    {
      name: 'Confluence',
      icon: 'X',
      color: 'bg-blue-600',
      description: 'Document collaboration.',
    },
    {
      name: 'EMS Product Discovery',
      icon: 'G',
      color: 'bg-blue-600',
      description: 'Prioritize, collaborate, and deliver new i...',
    },
    {
      name: 'EMS Service Management',
      icon: '⚡',
      color: 'bg-blue-600',
      description: 'Collaborative IT service managemnt',
    },
    {
      name: 'More Atlassian products',
      icon: '...',
      color: 'bg-purple-600',
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Grid size={20} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">YOUR APPS</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="p-2">
            {yourApps.map((app, index) => (
              <button
                key={index}
                className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className={`w-8 h-8 ${app.color} rounded flex items-center justify-center text-white text-sm font-bold`}>
                  {app.icon}
                </div>
                <span className="text-sm text-gray-900">{app.name}</span>
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              RECOMMENDED FOR YOUR TEAM
            </h3>
            <div className="space-y-2">
              {recommended.map((app, index) => (
                <button
                  key={index}
                  className="w-full flex items-start space-x-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                >
                  <div className={`w-8 h-8 ${app.color} rounded flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                    {app.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{app.name}</div>
                    {app.description && (
                      <div className="text-xs text-gray-500 mt-0.5">{app.description}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 px-3 py-2">
              <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white text-sm font-bold">
                X
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Confluence</div>
                <div className="text-xs text-gray-500">Document collaboration.</div>
              </div>
            </div>
            <button className="w-full mt-2 px-3 py-2 text-sm text-primary-600 hover:bg-gray-50 rounded-lg">
              Manage list
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppsDropdown;

