import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FavoritePage {
  name: string;
  path: string;
  icon: string;
}

interface FavoritesState {
  favorites: FavoritePage[];
  addFavorite: (page: FavoritePage) => void;
  removeFavorite: (path: string) => void;
  isFavorite: (path: string) => boolean;
  toggleFavorite: (page: FavoritePage) => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],

      addFavorite: (page) =>
        set((state) => {
          // Check if already exists
          if (state.favorites.some((fav) => fav.path === page.path)) {
            return state;
          }
          return { favorites: [...state.favorites, page] };
        }),

      removeFavorite: (path) =>
        set((state) => ({
          favorites: state.favorites.filter((fav) => fav.path !== path),
        })),

      isFavorite: (path) => {
        return get().favorites.some((fav) => fav.path === path);
      },

      toggleFavorite: (page) => {
        const state = get();
        if (state.isFavorite(page.path)) {
          state.removeFavorite(page.path);
        } else {
          state.addFavorite(page);
        }
      },
    }),
    {
      name: 'favorites-storage',
    }
  )
);
