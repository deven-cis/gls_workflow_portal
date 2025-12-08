// Mock API for Testing
// Use this to test the frontend without a real backend
// Set NEXT_PUBLIC_API_URL=http://localhost:3000/api to use mock API

import { NextResponse } from 'next/server';

// Mock database
const mockTasks = [
  {
    id: 'pending-1',
    date: '21 May',
    time: '11:00 AM',
    title: 'Federal Deposition - Daniels v. IRS',
    location: '123 Oak St NE, Atlanta, GA',
    jobId: 'Job001',
    status: 'videos-pending',
    uploadProgress: '1/3 videos uploaded',
    deadline: '0hrs 54 min',
    deadlineColor: 'text-red-600',
    details: 'Federal deposition regarding tax compliance and documentation.'
  },
  {
    id: 'pending-2',
    date: '22 May',
    time: '11:00 AM',
    title: 'Deposition: Johnson vs. Smith',
    location: '123 Oak St NE, Atlanta, GA',
    jobId: 'Job002',
    status: 'session-started',
    deadline: '0hrs 54 min',
    deadlineColor: 'text-green-600',
    details: 'Civil deposition - ongoing recording.'
  },
  {
    id: 'upcoming-1',
    date: '23 May',
    time: '10:00 AM',
    title: 'Deposition: Johnson vs. Smith',
    location: '123 Oak St NE, Atlanta, GA',
    jobId: 'Job001',
    status: 'upcoming'
  },
  {
    id: 'upcoming-2',
    date: '31 May',
    time: '10:00 AM',
    title: 'Federal Deposition - Daniels v. IRS',
    location: '123 Oak St NE, Atlanta, GA',
    jobId: 'Job002',
    status: 'upcoming'
  },
  {
    id: 'upcoming-3',
    date: '1 Jun',
    time: '11:00 AM',
    title: 'Federal Deposition - Daniels v. IRS',
    platform: 'Zoom',
    jobId: 'Job003',
    status: 'upcoming'
  }
];

// Simulate network delay
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * GET /api/tasks
 * Returns list of tasks with optional filtering
 */
export async function GET(request) {
  await delay();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let tasks = mockTasks;

  if (status) {
    tasks = tasks.filter(t => t.status === status);
  }

  return NextResponse.json({
    success: true,
    tasks,
    count: tasks.length
  });
}

/**
 * POST /api/tasks
 * Creates a new task
 */
export async function POST(request) {
  await delay();

  const data = await request.json();

  const newTask = {
    id: `task-${Date.now()}`,
    ...data,
    createdAt: new Date().toISOString()
  };

  mockTasks.push(newTask);

  return NextResponse.json({
    success: true,
    message: 'Task created',
    task: newTask
  }, { status: 201 });
}
