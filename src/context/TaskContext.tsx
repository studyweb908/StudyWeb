import React, { createContext, useContext, useState, useEffect } from 'react';
import { Workspace } from '../components/Dashboard/WorkspaceTypes';

interface TaskContextType {
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  activeTask: string;
  setActiveTask: (task: string) => void;
  intendedTask: string | null;
  requireWorkspaceForTask: (task: string) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);

  const [activeTask, setActiveTaskState] = useState(() => {
    return sessionStorage.getItem('studyweb_active_task') || 'dashboard';
  });
  
  const [intendedTask, setIntendedTask] = useState<string | null>(null);

  // Initialize workspace from session storage on mount
  useEffect(() => {
    const storedId = sessionStorage.getItem('studyweb_active_workspace_id');
    if (storedId) {
      const local = localStorage.getItem('studyweb_workspaces_v2');
      if (local) {
        try {
          const workspaces = JSON.parse(local) as Workspace[];
          const ws = workspaces.find((w: Workspace) => w.id === storedId);
          if (ws) {
            setActiveWorkspaceState(ws);
          }
        } catch (e) {}
      }
    }
  }, []);

  const setActiveTask = (task: string) => {
    setActiveTaskState(task);
    sessionStorage.setItem('studyweb_active_task', task);
  };

  const setActiveWorkspace = (ws: Workspace | null) => {
    setActiveWorkspaceState(ws);
    if (ws) {
      sessionStorage.setItem('studyweb_active_workspace_id', ws.id);
      if (intendedTask) {
        setActiveTask(intendedTask);
        setIntendedTask(null);
      }
    } else {
      sessionStorage.removeItem('studyweb_active_workspace_id');
    }
  };

  const requireWorkspaceForTask = (task: string) => {
    // Called when the user clicks "Select or Create a Workspace" from a fallback page
    setIntendedTask(task);
    setActiveTask('workspaces');
  };

  return (
    <TaskContext.Provider value={{
      activeWorkspace,
      setActiveWorkspace,
      activeTask,
      setActiveTask,
      intendedTask,
      requireWorkspaceForTask
    }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};
