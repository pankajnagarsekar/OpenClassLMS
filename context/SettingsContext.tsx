
import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { SystemSettings } from '../types';

interface SettingsContextType {
  settings: SystemSettings;
  refreshSettings: () => Promise<void>;
  loading: boolean;
}

const defaultSettings: SystemSettings = {
  ENABLE_PUBLIC_REGISTRATION: true,
  REQUIRE_EMAIL_VERIFICATION: true,
  MAINTENANCE_MODE: false,
  ENABLE_CERTIFICATES: true,
  ENABLE_STUDENT_UPLOADS: true,
  SHOW_COURSE_ANNOUNCEMENTS: true,
  SHOW_FEATURED_COURSES: true,
  ENABLE_DARK_MODE: false,
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  refreshSettings: async () => {},
  loading: true,
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const refreshSettings = async () => {
    try {
      const res = await api.get('/settings');
      // Merge defaults with api response to ensure all keys exist
      setSettings({ ...defaultSettings, ...res.data });
    } catch (err) {
      console.error("Failed to fetch system settings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, refreshSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
