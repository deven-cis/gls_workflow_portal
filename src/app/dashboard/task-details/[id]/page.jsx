'use client';

import TaskDetails from '@/components/task_details/TaskDetails';
import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { taskAPI } from '@/services/api';
export default function TaskDetailsPage() {
  const params = useParams();
  const taskCaseId = params.id;
  const [caseInfo, setCaseInfo] = useState(null);

  useEffect(() => {
    if (!taskCaseId) return;
    (async () => {
      try {
        const data = await taskAPI.getCaseById(taskCaseId);
        setCaseInfo(data);
      } catch (err) {
        console.error('Failed to fetch case info:', err);
      }
    })();
  }, [taskCaseId]);

  return <TaskDetails caseId={taskCaseId} caseInfo={caseInfo} />;
}