// Custom hooks for Tasks - Centralized state management
import { useState, useEffect, useCallback } from 'react';
import { taskAPI } from '@/services/api';

/**
 * Hook to fetch and manage tasks
 */
export const useTasks = (initialFilter = {}) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(initialFilter);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await taskAPI.getTasks(filter);
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err.message);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, filter, setFilter, refetch: fetchTasks };
};

/**
 * Hook to fetch a single task by ID
 */
export const useTaskById = (taskId) => {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!taskId) {
      setLoading(false);
      return;
    }

    const fetchTask = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await taskAPI.getTaskById(taskId);
        setTask(data);
      } catch (err) {
        setError(err.message);
        setTask(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

  return { task, loading, error };
};

/**
 * Hook to manage task mutations (create, update, delete)
 */
export const useTaskMutation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createTask = useCallback(async (taskData) => {
    try {
      setLoading(true);
      setError(null);
      return await taskAPI.createTask(taskData);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTask = useCallback(async (taskId, taskData) => {
    try {
      setLoading(true);
      setError(null);
      return await taskAPI.updateTask(taskId, taskData);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTask = useCallback(async (taskId) => {
    try {
      setLoading(true);
      setError(null);
      return await taskAPI.deleteTask(taskId);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createTask, updateTask, deleteTask, loading, error };
};

/**
 * Hook to manage file uploads
 */
export const useUpload = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const uploadVideo = useCallback(async (taskId, file) => {
    try {
      setLoading(true);
      setError(null);
      setProgress(0);

      const result = await taskAPI.uploadVideo(taskId, file);
      setProgress(100);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { uploadVideo, loading, error, progress };
};
