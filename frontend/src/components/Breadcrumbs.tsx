import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
}

export default function Breadcrumbs() {
  const location = useLocation();

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const pathnames = location.pathname.split('/').filter((x) => x);

    // Route name mappings
    const routeNames: Record<string, string> = {
      dashboard: 'Dashboard',
      profile: 'Profile',
      skills: 'Skills',
      matches: 'Find Matches',
      swaps: 'My Swaps',
      connections: 'Connections',
      gamification: 'Gamification',
      events: 'Events',
      pricing: 'Pricing',
      subscription: 'Subscription',
      settings: 'Settings',
      notifications: 'Notifications',
      admin: 'Admin',
      users: 'Users',
      moderation: 'Moderation',
    };

    const breadcrumbs: BreadcrumbItem[] = [];

    pathnames.forEach((pathname, index) => {
      const path = `/${pathnames.slice(0, index + 1).join('/')}`;
      const label = routeNames[pathname] || pathname.charAt(0).toUpperCase() + pathname.slice(1);

      breadcrumbs.push({ label, path });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Don't show breadcrumbs on home page
  if (location.pathname === '/' || location.pathname === '/dashboard') {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm mb-6" aria-label="Breadcrumb">
      {/* Home Link */}
      <Link
        to="/dashboard"
        className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only">Home</span>
      </Link>

      {breadcrumbs.map((breadcrumb, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <div key={breadcrumb.path} className="flex items-center space-x-2">
            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-600" />
            {isLast ? (
              <span className="text-gray-900 dark:text-white font-medium">
                {breadcrumb.label}
              </span>
            ) : (
              <Link
                to={breadcrumb.path}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                {breadcrumb.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
