// Mock task detail endpoint
import { NextResponse } from 'next/server';

const mockTasks = {
  'pending-1': {
    id: 'pending-1',
    date: '21 May',
    time: '11:00 AM',
    title: 'Federal',
    location: '123 Oak St NE, Atlanta, GA',
    jobId: 'Job001',
    status: 'videos-pending',
    uploadProgress: '1/3 videos uploaded',
    deadline: '0hrs 54 min',
    deadlineColor: 'text-red-600',
    details: 'Federal deposition regarding tax compliance and documentation. Witness: John Daniels. Expected duration: 4 hours.'
  },
  'pending-2': {
    id: 'pending-2',
    date: '22 May',
    time: '11:00 AM',
    title: 'Deposition: Johnson vs. Smith',
    location: '123 Oak St NE, Atlanta, GA',
    jobId: 'Job002',
    status: 'session-started',
    deadline: '0hrs 54 min',
    deadlineColor: 'text-green-600',
    details: 'Civil deposition currently in progress. Live recording ongoing.'
  },
  'upcoming-1': {
    id: 'upcoming-1',
    date: '23 May',
    time: '10:00 AM',
    title: 'Deposition: Johnson vs. Smith',
    location: '123 Oak St NE, Atlanta, GA',
    jobId: 'Job001',
    status: 'upcoming',
    details: 'Scheduled deposition - further details will be updated.'
  }
};

const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * GET /api/tasks/[id]
 * Returns a single task by ID
 */
export async function GET(request, { params }) {
  await delay();

  const { id } = params;
  const task = mockTasks[id];

  if (!task) {
    return NextResponse.json({
      success: false,
      message: 'Task not found'
    }, { status: 404 });
  }

  return NextResponse.json(task);
}

/**
 * PUT /api/tasks/[id]
 * Updates a task
 */
export async function PUT(request, { params }) {
  await delay();

  const { id } = params;
  const data = await request.json();

  if (!mockTasks[id]) {
    return NextResponse.json({
      success: false,
      message: 'Task not found'
    }, { status: 404 });
  }

  mockTasks[id] = { ...mockTasks[id], ...data };

  return NextResponse.json({
    success: true,
    message: 'Task updated',
    task: mockTasks[id]
  });
}

/**
 * DELETE /api/tasks/[id]
 * Deletes a task
 */
export async function DELETE(request, { params }) {
  await delay();

  const { id } = params;

  if (!mockTasks[id]) {
    return NextResponse.json({
      success: false,
      message: 'Task not found'
    }, { status: 404 });
  }

  delete mockTasks[id];

  return NextResponse.json({
    success: true,
    message: 'Task deleted'
  });
}
