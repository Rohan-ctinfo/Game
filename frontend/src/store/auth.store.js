import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  userId: Number(localStorage.getItem('userId') || 0),
  username: localStorage.getItem('username') || '',
  accessToken: localStorage.getItem('accessToken') || '',
  setAuth: ({ userId, username, accessToken }) => {
    localStorage.setItem('userId', String(userId));
    localStorage.setItem('username', String(username || ''));
    localStorage.setItem('accessToken', accessToken);
    set({ userId, username: username || '', accessToken });
  },
  clearAuth: () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('accessToken');
    set({ userId: 0, username: '', accessToken: '' });
  }
}));
