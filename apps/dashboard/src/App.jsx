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
import { CommandPalette } from './components/search/CommandPalette.jsx';
import { SubmitJobModal } from './components/jobs/SubmitJobModal.jsx';
import { api } from './services/api.js';
import { connectEventStream } from './services/sse.js';

export function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
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
    setTimeout(() => setIsRefreshing(false), 400);
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
    <div className="min-h-screen bg-[#070A12] text-[#F4F7FB] flex flex-col selection:bg-cyan-500/20 selection:text-cyan-300">
      <Header
        currentTenant={tenant}
        activeTab={activeTab}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onOpenDispatchModal={() => setIsDispatchModalOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        isMobileNavOpen={isMobileNavOpen}
        onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)}
      />

      <div className="flex flex-1 relative">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsMobileNavOpen(false);
          }}
          isOpen={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
        />

        <main className="flex-1 p-3.5 sm:p-6 lg:p-7 max-w-full lg:max-w-7xl overflow-x-hidden transition-all">
          {activeTab === 'overview' && (
            <SystemOverview
              jobs={jobs}
              workers={workers}
              onTriggerDemoJob={handleTriggerDemoJob}
              onNavigateTab={setActiveTab}
              onOpenDispatchModal={() => setIsDispatchModalOpen(true)}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === 'queue' && (
            <QueueExplorer queues={queues} jobs={jobs} onRefresh={loadAllData} />
          )}

          {activeTab === 'jobs' && (
            <JobInspector jobs={jobs} onRefresh={loadAllData} />
          )}

          {activeTab === 'workflows' && (
            <WorkflowManager workflows={workflows} onRefresh={loadAllData} />
          )}

          {activeTab === 'workers' && (
            <WorkerRadar workers={workers} jobs={jobs} onRefresh={loadAllData} />
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

      {/* Global Command Palette (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={(tab) => {
          if (tab === 'open_search') {
            setIsCommandPaletteOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onTriggerDispatch={() => setIsDispatchModalOpen(true)}
        jobs={jobs}
        workers={workers}
        queues={queues}
        workflows={workflows}
        schedules={schedules}
      />

      {/* Global Dispatch Task Modal */}
      <SubmitJobModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        onJobCreated={loadAllData}
      />
    </div>
  );
}
