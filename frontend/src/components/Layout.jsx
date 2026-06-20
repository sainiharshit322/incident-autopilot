import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, AlertCircle, LogOut } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Incidents', path: '/incidents', icon: AlertCircle },
  ];

  return (
    <div className="flex h-screen overflow-hidden text-slate-200">
      {/* Sidebar */}
      <aside className="w-64 glass border-r border-white/10 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            AutoPilot
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="mb-4 px-4 py-2 bg-white/5 rounded-lg text-sm text-slate-300">
            Logged in as <span className="font-semibold text-white">{user.subject}</span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-white/5 hover:text-red-400 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 glass border-b border-white/10 flex items-center justify-between px-8 z-10">
          <h1 className="text-lg font-medium text-slate-200 capitalize">
            {location.pathname.split('/')[1] || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center font-bold text-sm shadow-lg">
              {user.subject.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8 relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
