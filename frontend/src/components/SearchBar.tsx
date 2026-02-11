import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, User, BookOpen, Repeat, Loader2 } from 'lucide-react';
import api from '../services/api';

interface SearchResult {
  type: 'user' | 'skill' | 'swap';
  id: string;
  title: string;
  subtitle?: string;
  path: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchDebounce = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/search?q=${encodeURIComponent(query)}`);

        const searchResults: SearchResult[] = [];

        // Add users to results
        if (response.data.data?.users) {
          response.data.data.users.forEach((user: any) => {
            searchResults.push({
              type: 'user',
              id: user.userId,
              title: user.name,
              subtitle: user.bio || user.city,
              path: `/profile/${user.userId}`,
            });
          });
        }

        // Add skills to results
        if (response.data.data?.skills) {
          response.data.data.skills.forEach((skill: any) => {
            searchResults.push({
              type: 'skill',
              id: skill.skillId,
              title: skill.name,
              subtitle: skill.category?.name,
              path: `/skills/${skill.skillId}`,
            });
          });
        }

        // Add swaps to results
        if (response.data.data?.swaps) {
          response.data.data.swaps.forEach((swap: any) => {
            searchResults.push({
              type: 'swap',
              id: swap.swapId,
              title: `${swap.requesterSkill?.name} ↔ ${swap.providerSkill?.name}`,
              subtitle: swap.status,
              path: `/swaps/${swap.swapId}`,
            });
          });
        }

        setResults(searchResults);
        setIsOpen(searchResults.length > 0);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(searchDebounce);
  }, [query]);

  const handleResultClick = (path: string) => {
    navigate(path);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User className="h-4 w-4" />;
      case 'skill':
        return <BookOpen className="h-4 w-4" />;
      case 'swap':
        return <Repeat className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div ref={searchRef} className="relative flex-1 max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && results.length > 0 && setIsOpen(true)}
          placeholder="Search skills, users, or swaps..."
          className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 animate-spin" />
        )}
        {!isLoading && query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50">
          <div className="p-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2 font-semibold uppercase tracking-wider">
              Search Results ({results.length})
            </div>
            {results.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleResultClick(result.path)}
                className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left group"
              >
                <div className="mt-0.5 p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                  {getIcon(result.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white truncate">
                      {result.title}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                      {getTypeLabel(result.type)}
                    </span>
                  </div>
                  {result.subtitle && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {result.subtitle}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 z-50 text-center">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">No results found</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Try different keywords or check your spelling
          </p>
        </div>
      )}
    </div>
  );
}
