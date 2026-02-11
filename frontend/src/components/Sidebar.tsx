import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Target,
  Repeat,
  BookOpen,
  Trophy,
  Calendar,
  CreditCard,
  Bell,
  UserCircle,
  Shield,
  UserCog,
  Flag,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Moon,
  Sun,
  Star,
  StarOff,
} from 'lucide-react';
import { useThemeStore } from '../stores/themeStore';
import { useFavoritesStore } from '../stores/favoritesStore';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
  requiresAdmin?: boolean; // Add this flag
}

export default function Sidebar() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const { theme, toggleTheme } = useThemeStore();
  const { favorites, toggleFavorite, isFavorite } = useFavoritesStore();

  // Fetch user role on component mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const response = await fetch('http://localhost:5000/api/v1/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUserRole(data.data.user.role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, []);

  const navSections: NavSection[] = [
    {
      title: 'Main',
      items: [
         //name: 'Home', path: '/', icon: Home },
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Profile', path: '/profile', icon: UserCircle },
      ],
    },
    {
      title: 'Skills & Learning',
      items: [
        { name: 'My Skills', path: '/skills', icon: BookOpen },
        { name: 'Find Matches', path: '/matches', icon: Target },
        { name: 'My Swaps', path: '/swaps', icon: Repeat },
        { name: 'Connections', path: '/connections', icon: Users },
      ],
    },
    {
      title: 'Engagement',
      items: [
        { name: 'Gamification', path: '/gamification', icon: Trophy },
        { name: 'Events', path: '/events', icon: Calendar },
      ],
    },
    {
      title: 'Account',
      items: [
        { name: 'Subscription', path: '/subscription', icon: CreditCard },
        { name: 'Pricing', path: '/pricing', icon: CreditCard },
        { name: 'Notifications', path: '/settings/notifications', icon: Bell },
      ],
    },
    {
      title: 'Admin',
      requiresAdmin: true, // Mark this section as admin-only
      items: [
        { name: 'Admin Dashboard', path: '/admin', icon: Shield },
        { name: 'Manage Users', path: '/admin/users', icon: UserCog },
        { name: 'Moderation', path: '/admin/moderation', icon: Flag },
      ],
    },
  ];

  // Filter sections based on user role
  const filteredNavSections = navSections.filter(section => {
    if (section.requiresAdmin) {
      return userRole === 'ADMIN';
    }
    return true;
  });

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!isCollapsed && (
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">SkillSwap</span>
          </Link>
        )}
        {isCollapsed && (
          <Link to="/dashboard" className="flex items-center justify-center w-full">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Favorites Section */}
        {favorites.length > 0 && (
          <div>
            {!isCollapsed && (
              <h3 className="px-3 mb-2 text-xs font-semibold text-yellow-600 dark:text-yellow-500 uppercase tracking-wider flex items-center">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Favorites
              </h3>
            )}
            {isCollapsed && <div className="border-t border-yellow-300 dark:border-yellow-700 my-2" />}
            <div className="space-y-1">
              {favorites.map((fav) => {
                const active = isActive(fav.path);
                return (
                  <Link
                    key={fav.path}
                    to={fav.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      active
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-l-4 border-yellow-600 dark:border-yellow-500'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? fav.name : ''}
                  >
                    <Star className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 fill-current text-yellow-500`} />
                    {!isCollapsed && <span className="flex-1">{fav.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Navigation Sections - Use filtered sections */}
        {filteredNavSections.map((section) => (
          <div key={section.title}>
            {!isCollapsed && (
              <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            {isCollapsed && <div className="border-t border-gray-200 dark:border-gray-700 my-2" />}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                const favorite = isFavorite(item.path);
                return (
                  <div key={item.path} className="group relative">
                    <Link
                      to={item.path}
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        active
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-l-4 border-blue-700 dark:border-blue-500'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                      } ${isCollapsed ? 'justify-center' : ''}`}
                      title={isCollapsed ? item.name : ''}
                    >
                      <Icon className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
                      {!isCollapsed && (
                        <span className="flex-1">{item.name}</span>
                      )}
                      {!isCollapsed && item.badge && (
                        <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                    {!isCollapsed && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFavorite({ name: item.name, path: item.path, icon: 'star' });
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={favorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {favorite ? (
                          <Star className="h-4 w-4 fill-current text-yellow-500" />
                        ) : (
                          <StarOff className="h-4 w-4 text-gray-400 hover:text-yellow-500" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Theme Toggle & Collapse Toggle (Desktop Only) */}
      <div className="hidden md:block p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title={isCollapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : ''}
        >
          {isCollapsed ? (
            theme === 'dark' ? (
              <Sun className="h-5 w-5 text-yellow-500" />
            ) : (
              <Moon className="h-5 w-5 text-indigo-600" />
            )
          ) : (
            <>
              {theme === 'dark' ? (
                <Sun className="mr-2 h-5 w-5 text-yellow-500" />
              ) : (
                <Moon className="mr-2 h-5 w-5 text-indigo-600" />
              )}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </>
          )}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="mr-2 h-5 w-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        {isMobileOpen ? (
          <X className="h-6 w-6 text-gray-700 dark:text-gray-300" />
        ) : (
          <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-40 h-full bg-white dark:bg-gray-800 shadow-xl transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } w-64`}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block fixed top-0 left-0 h-full bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Spacer for desktop sidebar */}
      <div
        className={`hidden md:block transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      />
    </>
  );
}