'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'employee';
}

interface Task {
  id: number;
  title: string;
  description: string;
  assignedTo: string;
  deadline: string;
  progress: number;
  status: 'pending' | 'in-progress' | 'completed';
  createdBy: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: '', deadline: '' });
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (!stored) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(stored));

    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
      setTasks(JSON.parse(storedTasks));
    } else {
      const defaultTasks: Task[] = [
        {
          id: 1,
          title: 'Complete Q4 Report',
          description: 'Prepare the quarterly report for management',
          assignedTo: 'employee@office.com',
          deadline: '2026-11-15',
          progress: 40,
          status: 'in-progress',
          createdBy: 'manager@office.com'
        },
        {
          id: 2,
          title: 'Update Website Content',
          description: 'Refresh the company website with new products',
          assignedTo: 'employee2@office.com',
          deadline: '2026-11-10',
          progress: 10,
          status: 'pending',
          createdBy: 'admin@office.com'
        }
      ];
      setTasks(defaultTasks);
      localStorage.setItem('tasks', JSON.stringify(defaultTasks));
    }
  }, [router]);

  const saveTasks = (updated: Task[]) => {
    setTasks(updated);
    localStorage.setItem('tasks', JSON.stringify(updated));
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) return;

    const task: Task = {
      id: Date.now(),
      title: newTask.title,
      description: newTask.description,
      assignedTo: newTask.assignedTo,
      deadline: newTask.deadline,
      progress: 0,
      status: 'pending',
      createdBy: user.email
    };
    saveTasks([...tasks, task]);
    setNewTask({ title: '', description: '', assignedTo: '', deadline: '' });
    setShowCreate(false);
  };

  const updateProgress = (id: number, progress: number) => {
    const updated = tasks.map(t => 
      t.id === id ? { ...t, progress, status: progress === 100 ? 'completed' : progress > 0 ? 'in-progress' : 'pending' } : t
    );
    saveTasks(updated);
  };

  const logout = () => {
    localStorage.removeItem('currentUser');
    router.push('/login');
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const visibleTasks = user.role === 'employee' 
    ? tasks.filter(t => t.assignedTo === user.email)
    : tasks;

  const canCreate = user.role === 'admin' || user.role === 'manager';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Office Task Manager</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Welcome, {user.name} ({user.role})</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm">Total Tasks</h3>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{visibleTasks.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm">In Progress</h3>
            <p className="text-3xl font-bold text-blue-600">{visibleTasks.filter(t => t.status === 'in-progress').length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm">Completed</h3>
            <p className="text-3xl font-bold text-green-600">{visibleTasks.filter(t => t.status === 'completed').length}</p>
          </div>
        </div>

        {canCreate && (
          <div className="mb-6">
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              {showCreate ? 'Cancel' : '+ Create New Task'}
            </button>
          </div>
        )}

        {showCreate && canCreate && (
          <form onSubmit={handleCreateTask} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow mb-8 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Create Task</h3>
            <input
              type="text"
              placeholder="Task Title"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              required
            />
            <textarea
              placeholder="Description"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              rows={3}
            />
            <input
              type="email"
              placeholder="Assign to (email)"
              value={newTask.assignedTo}
              onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              required
            />
            <input
              type="date"
              value={newTask.deadline}
              onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              required
            />
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg">
              Create Task
            </button>
          </form>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            {user.role === 'employee' ? 'My Tasks' : 'All Tasks'}
          </h2>
          {visibleTasks.length === 0 ? (
            <p className="text-gray-500">No tasks found.</p>
          ) : (
            visibleTasks.map(task => (
              <div key={task.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{task.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">{task.description}</p>
                    <div className="mt-2 text-sm text-gray-500">
                      <span>Assigned to: {task.assignedTo}</span> • 
                      <span> Deadline: {task.deadline}</span> • 
                      <span> By: {task.createdBy}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    task.status === 'completed' ? 'bg-green-100 text-green-800' :
                    task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {task.status}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{task.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                  {(user.role === 'admin' || user.role === 'manager' || task.assignedTo === user.email) && (
                    <div className="mt-3 flex gap-2">
                      {[0, 25, 50, 75, 100].map(p => (
                        <button
                          key={p}
                          onClick={() => updateProgress(task.id, p)}
                          className={`px-3 py-1 text-xs rounded ${
                            task.progress === p ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'
                          }`}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
