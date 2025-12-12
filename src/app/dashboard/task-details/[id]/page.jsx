'use client';
import TaskDetails from '@/components/task_details/TaskDetails';
import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { taskAPI } from '@/services/api';
import { witnessesAPI } from '@/services/witnesses_apis';

export default function TaskDetailsPage() {
  const params = useParams();
  const taskCaseId = params.id;
  const searchParams = useSearchParams();
  const selectedTaskId = searchParams.get('selected');
  console.log('selectedTaskId', selectedTaskId);
  const [caseInfo, setCaseInfo] = useState(null);
  const [witnessesData, setWitnessesData] = useState([]);

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

  useEffect(() => {
    if (!taskCaseId) return;
    (async () => {
      try {
        const data = await witnessesAPI.getJobWitnesses(taskCaseId);
        setWitnessesData(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch witnesses:', err);
      }
    })();
  }, [taskCaseId]);

  return <TaskDetails caseId={taskCaseId} caseInfo={caseInfo} witnessesData={witnessesData} />;
}