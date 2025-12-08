'use client';

import TaskDetails from '@/components/TaskDetails';
import { useParams } from 'next/navigation';

export default function TaskDetailsPage() {
  const params = useParams();
  const taskId = params.id;

  return <TaskDetails taskId={taskId} />;
}
