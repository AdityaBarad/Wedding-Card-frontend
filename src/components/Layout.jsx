import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { ScrollText, LogOut, User, Home } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function Layout() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between h-20 items-center">
            {/* Left Side: Logo and Navigation Links */}
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-3">
                <ScrollText className="w-8 h-8 text-blue-600" />
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Wedding Cards
                </span>
              </Link>

              {user && (
                <div className="flex items-center space-x-6">
                  <Link
                    to="/"
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-50"
                  >
                    <Home className="w-5 h-5" />
                    <span className="text-sm font-medium">Dashboard</span>
                  </Link>
                  {/* <Link
                    to="/projects"
                    className="text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium"
                  >
                    Projects
                  </Link> */}
                </div>
              )}
            </div>

            {/* Right Side: User Info and Sign Out */}
            {user && (
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-lg">
                  <User className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {user.email}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}