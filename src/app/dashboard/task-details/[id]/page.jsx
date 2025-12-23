'use client';
import TaskDetails from '@/components/task_details/TaskDetails';
import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { witnessesAPI } from '@/services/witnesses_apis';
import { casesAPI } from '@/services/cases_apis';

export default function TaskDetailsPage() {
  const params = useParams();
  const taskCaseId = params.id;
  const searchParams = useSearchParams();
  const selectedJobId = searchParams.get('jobId');
  const [caseInfo, setCaseInfo] = useState(null);
  const [witnessesData, setWitnessesData] = useState([]);

  useEffect(() => {
    if (!taskCaseId) return;
    (async () => {
      try {
        const data = await casesAPI.getCaseById(taskCaseId);
        console.log('Fetched case info:', data);
        setCaseInfo(data);
      } catch (err) {
        console.error('Failed to fetch case info:', err);
      }
    })();
  }, [taskCaseId]);

  useEffect(() => {
    if (!selectedJobId) return;
    (async () => {
      try {
        const data = await witnessesAPI.getJobWitnesses(selectedJobId);
        console.log('Fetched witnesses data:', data);
        setWitnessesData(data);
      } catch (err) {
        console.error('Failed to fetch witnesses:', err);
      }
    })();
  }, [selectedJobId]);

  return <TaskDetails caseId={taskCaseId} caseInfo={caseInfo} witnessesData={witnessesData} />;
}