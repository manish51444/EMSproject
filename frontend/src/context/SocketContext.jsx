import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const socketRef = useRef(null);
  const queryClientRef = useRef(queryClient);
  
  // Keep queryClient ref updated (it's stable but ref ensures we always have latest)
  useEffect(() => {
    queryClientRef.current = queryClient;
  }, [queryClient]);

  useEffect(() => {
    if (!user) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.removeAllListeners();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Get API URL from environment or default
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socketUrl = API_URL.replace('/api', ''); // Remove /api if present

    // Create socket connection
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection event handlers
    newSocket.on('connect', () => {
      setIsConnected(true);
      if (import.meta.env.DEV) console.log('Socket connected');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      if (import.meta.env.DEV) console.log('Socket disconnected');
    });

    newSocket.on('connect_error', (error) => {
      if (import.meta.env.DEV) console.error('Socket connection error:', error);
    });

    // Real-time event handlers - use debouncing to prevent excessive invalidations
    let invalidationTimeout = null;
    const debouncedInvalidate = (queryKeys, delay = 100) => {
      if (invalidationTimeout) {
        clearTimeout(invalidationTimeout);
      }
      invalidationTimeout = setTimeout(() => {
        queryKeys.forEach(key => {
          queryClientRef.current.invalidateQueries({ queryKey: key });
        });
      }, delay);
    };

    newSocket.on('issue:created', (issue) => {
      const projectId = issue.projectId?._id || issue.projectId;
      debouncedInvalidate([
        ['issues'],
        ['issues', projectId]
      ]);
      
      // Show notification
      toast.success(`New issue created: ${issue.title}`, {
        duration: 3000,
      });
    });

    newSocket.on('issue:updated', (issue) => {
      const projectId = issue.projectId?._id || issue.projectId;
      debouncedInvalidate([
        ['issue', issue._id],
        ['issues'],
        ['issues', projectId]
      ]);
    });

    newSocket.on('issue:status_updated', (issue) => {
      const projectId = issue.projectId?._id || issue.projectId;
      debouncedInvalidate([
        ['issue', issue._id],
        ['issues'],
        ['issues', projectId]
      ]);
      
      toast.success(`Issue status updated: ${issue.title}`, {
        duration: 2000,
      });
    });

    newSocket.on('issue:deleted', ({ issueId, projectId }) => {
      debouncedInvalidate([
        ['issue', issueId],
        ['issues'],
        ['issues', projectId]
      ]);
      
      toast.success('Issue deleted', {
        duration: 2000,
      });
    });

    newSocket.on('issue:approved', (issue) => {
      debouncedInvalidate([
        ['issue', issue._id],
        ['issues']
      ]);
      
      toast.success(`Issue approved: ${issue.title}`, {
        duration: 3000,
      });
    });

    newSocket.on('issue:rejected', (issue) => {
      debouncedInvalidate([
        ['issue', issue._id],
        ['issues']
      ]);
      
      toast.error(`Issue rejected: ${issue.title}`, {
        duration: 3000,
      });
    });

    newSocket.on('comment:created', (comment) => {
      debouncedInvalidate([
        ['comments', comment.issueId],
        ['issue', comment.issueId]
      ]);
    });

    newSocket.on('comment:updated', (comment) => {
      debouncedInvalidate([
        ['comments', comment.issueId]
      ]);
    });

    newSocket.on('comment:deleted', ({ commentId, issueId }) => {
      debouncedInvalidate([
        ['comments', issueId]
      ]);
    });

    newSocket.on('worklog:created', (workLog) => {
      debouncedInvalidate([
        ['workLogs', workLog.issueId],
        ['issue', workLog.issueId]
      ]);
    });

    newSocket.on('worklog:updated', (workLog) => {
      debouncedInvalidate([
        ['workLogs', workLog.issueId],
        ['issue', workLog.issueId]
      ]);
    });

    newSocket.on('worklog:deleted', ({ workLogId, issueId }) => {
      debouncedInvalidate([
        ['workLogs', issueId],
        ['issue', issueId]
      ]);
    });

    // Cleanup on unmount
    return () => {
      if (invalidationTimeout) {
        clearTimeout(invalidationTimeout);
      }
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [user]); // Removed queryClient from dependencies - it's stable and doesn't need to be in deps

  // Function to join a project room
  const joinProject = (projectId) => {
    if (socketRef.current && projectId) {
      socketRef.current.emit('join-project', projectId);
    }
  };

  // Function to leave a project room
  const leaveProject = (projectId) => {
    if (socketRef.current && projectId) {
      socketRef.current.emit('leave-project', projectId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinProject, leaveProject }}>
      {children}
    </SocketContext.Provider>
  );
};

