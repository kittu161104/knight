import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DivideIcon as LucideIcon, Camera } from 'lucide-react';

interface NavigationItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

interface NavigationProps {
  items: NavigationItem[];
}

const Navigation: React.FC<NavigationProps> = ({ items }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed left-0 top-0 h-full w-16 md:w-64 bg-white border-r border-gray-200 z-50">
      <div className="flex flex-col h-full">
        {/* Logo and Name */}
        <div className="p-4 border-b border-gray-600">
          <div 
            className="flex items-center space-x-3 cursor-pointer" 
            onClick={() => navigate('/')}
          >
            <Camera className="w-8 h-8 text-black" />
            <span className="hidden md:block text-lg font-bold text-gray-900">
              Knight's Vision
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-4">
          <div className="space-y-2">
            {items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center px-3 py-3 space-x-3
                    ${isActive 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-grey-900'}
                    transition-colors duration-150`}
                >
                  <item.icon className="w-6 h-6 flex-shrink-0" />
                  <span className="hidden md:block text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;