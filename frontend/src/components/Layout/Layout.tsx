import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';
import RecoverAccount from '../RecoverAccount/RecoverAccount';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);
  const [showingLoginDialog, showLoginDialog] = useState(false);

  function toggleLoginDialog() {
    showLoginDialog(true);
  }

  return (
    <div className={`min-h-screen bg-cinema-950 text-stone-100 flex flex-col selection:bg-cinema-500 selection:text-white ${styles['layout']}`}>
      
      {/* Top Navigation Bar */}
      <header className={`sticky top-0 z-50 backdrop-blur-md bg-cinema-950/80 px-6 py-4 flex items-center justify-between ${styles['header']}`}>
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-indigo-500 to-rose-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-lg font-black text-white">🎬</span>
          </div>
          <span className="text-xl font-bold tracking-tight bg-linear-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            BoxOffice<span className="text-rose-400">Guesser</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
          <button 
            onClick={() => navigate('/')} 
            className={`transition-colors ${location.pathname === '/' ? 'text-rose-400' : 'hover:text-white'}`}
          >
            Lobby
          </button>
          <button 
            onClick={() => navigate('/leaderboard')} 
            className={`transition-colors ${location.pathname === '/leaderboard' ? 'text-rose-400' : 'hover:text-white'}`}
          >
            Leaderboard
          </button>
          <button 
            onClick={() => navigate('/challenges')} 
            className={`transition-colors ${location.pathname === '/challenges' ? 'text-rose-400' : 'hover:text-white'}`}
          >
            Challenges
          </button>
        </nav>

        <div className="flex items-center space-x-4">
          <div >
            {user ? (
              <div className="flex items-center space-x-3 bg-cinema-900  px-3 py-1.5 rounded-full">
                <div 
                  onClick={() => navigate('/profile')} 
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-cinema-600 flex items-center justify-center text-xs font-bold text-white shadow">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-sm font-medium text-slate-200 hidden sm:inline">{user.name}</span>
                </div>
                <button 
                  onClick={logout}
                  className="text-xs text-stone-400 hover:text-rose-400 border-l border-cinema-700 pl-3 transition-colors"
                >
                  Log out
                </button>
              </div>
            ) : (
              <button 
                onClick={toggleLoginDialog}
                className="bg-cinema-600 hover:bg-cinema-500 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-lg shadow-cinema-600/30 transition-all"
              >
                Restore Access
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Login / Restore Access Modal */}
      {showingLoginDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cinema-950/80 backdrop-blur-sm p-4">
          <div className="bg-cinema-900 border border-cinema-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <RecoverAccount
              onClose={() => showLoginDialog(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      {/* <footer className="border-t border-cinema-800 bg-cinema-950/50 py-6 px-6 text-center text-xs text-stone-400">
        <p>© 2026 BoxOfficeGuesser. Powered by official box office tracking data.</p>
      </footer> */}
    </div>
  );
}