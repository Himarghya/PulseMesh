import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header.jsx';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { SystemOverview } from './components/overview/SystemOverview.jsx';
import { QueueExplorer } from './components/queue/QueueExplorer.jsx';
import { JobInspector } from './components/jobs/JobInspector.jsx';
import { WorkflowManager } from './components/workflows/WorkflowManager.jsx';
import { WorkerRadar } from './components/workers/WorkerRadar.jsx';
import { ScheduleManager } from './components/schedules/ScheduleManager.jsx';
import { ChaosConsole } from './components/chaos/ChaosConsole.jsx';
import { ApiKeysAndRBAC } from './components/settings/ApiKeysAndRBAC.jsx';
import { api } from './services/api.js';
import { connectEventStream } from './services/sse.js';

export function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [jobs, setJobs] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [queues, setQueues] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [tenant, setTenant] = useState({ organizationName: 'Primary Cluster' });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Initial data fetch
    loadAllData();

    // Connect real-time Server-Sent Events stream
    const cleanup = connectEventStream((event) => {
      console.log('⚡ [Pulse Live Event]', event);
      loadAllData();
    });

    // Fallback polling every 4s
    const pollInterval = setInterval(() => {
      loadAllData();
    }, 4000);

    return () => {
      cleanup();
      clearInterval(pollInterval);
    };
  }, []);

  const loadAllData = async () => {
    try {
      const [jobsRes, workersRes, queuesRes, wfRes, schedRes] = await Promise.all([
        api.getJobs().catch(() => ({ data: [] })),
        api.getWorkers().catch(() => ({ data: [] })),
        api.getQueues().catch(() => ({ data: [] })),
        api.getWorkflows().catch(() => ({ data: [] })),
        api.getSchedules().catch(() => ({ data: [] })),
      ]);

      setJobs(jobsRes.data || []);
      setWorkers(workersRes.data || []);
      setQueues(queuesRes.data || []);
      setWorkflows(wfRes.data || []);
      setSchedules(schedRes.data || []);
    } catch (err) {
      console.warn('Data sync warning:', err.message);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAllData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleTriggerDemoJob = async () => {
    try {
      const taskTypes = ['image_resize', 'csv_processing', 'report_generation', 'mock_payment', 'data_transform'];
      const randomType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
      await api.createJob({
        type: randomType,
        priority: Math.floor(Math.random() * 8) + 2,
        payload: { demo: true, dispatchedAt: new Date().toISOString() },
      });
      await loadAllData();
    } catch (err) {
      alert(`Job dispatch failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col">
      <Header
        currentTenant={tenant}
        activeTab={activeTab}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <div className="flex flex-1">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl overflow-x-hidden">
          {activeTab === 'overview' && (
            <SystemOverview
              jobs={jobs}
              workers={workers}
              onTriggerDemoJob={handleTriggerDemoJob}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'queue' && (
            <QueueExplorer queues={queues} onRefresh={loadAllData} />
          )}

          {activeTab === 'jobs' && (
            <JobInspector jobs={jobs} onRefresh={loadAllData} />
          )}

          {activeTab === 'workflows' && (
            <WorkflowManager workflows={workflows} onRefresh={loadAllData} />
          )}

          {activeTab === 'workers' && (
            <WorkerRadar workers={workers} onRefresh={loadAllData} />
          )}

          {activeTab === 'schedules' && (
            <ScheduleManager schedules={schedules} onRefresh={loadAllData} />
          )}

          {activeTab === 'chaos' && (
            <ChaosConsole workers={workers} jobs={jobs} onRefresh={loadAllData} />
          )}

          {activeTab === 'settings' && (
            <ApiKeysAndRBAC tenant={tenant} />
          )}
        </main>
      </div>
    </div>
  );
}
