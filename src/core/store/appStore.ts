import { create } from 'zustand';
import { AppRole } from '../config/appConfig';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
}

interface AppState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  selectedRole: AppRole;
  selectedRobotId: string | null;
  activeMissionId: string | null;
  isMapExpanded: boolean;
  setUser: (user: AuthUser | null) => void;
  setAuthenticated: (value: boolean) => void;
  setSelectedRole: (role: AppRole) => void;
  setSelectedRobotId: (robotId: string | null) => void;
  setActiveMissionId: (missionId: string | null) => void;
  setMapExpanded: (value: boolean) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isAuthenticated: false,
  user: null,
  selectedRole: 'READER',
  selectedRobotId: null,
  activeMissionId: null,
  isMapExpanded: false,
  setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setSelectedRole: (role) => set({ selectedRole: role }),
  setSelectedRobotId: (robotId) => set({ selectedRobotId: robotId }),
  setActiveMissionId: (missionId) => set({ activeMissionId: missionId }),
  setMapExpanded: (value) => set({ isMapExpanded: value }),
  logout: () => set({ isAuthenticated: false, user: null, selectedRole: 'READER' }),
}));
