/**
 * Clixen MVP Success Metrics Dashboard
 * Real-time monitoring of key MVP performance indicators
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Layout';

interface MVPMetrics {
  onboarding_completion_rate: number;
  workflow_persistence_rate: number;
  deployment_success_rate: number;
  targets: {
    onboarding_completion_rate: number;
    workflow_persistence_rate: number;
    deployment_success_rate: number;
  };
}

interface PerformanceMetrics {
  avg_response_time: number;
  p95_response_time: number;
  error_rate: number;
  uptime_percentage: number;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  services: Array<{
    service: string;
    status: string;
    response_time_ms: number;
  }>;
  alerts: Array<{
    severity: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: string;
  }>;
}

interface DashboardData {
  mvp_metrics: MVPMetrics;
  performance_metrics: PerformanceMetrics;
  system_health: SystemHealth;
  timestamp: string;
}

export const MVPMetricsDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/monitoring-api`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'dashboard' })
      });

      if (!response.ok) {
        throw new Error(`Dashboard API returned ${response.status}`);
      }

      const data = await response.json();
      setDashboardData(data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getMetricStatusColor = (value: number, target: number, higher_is_better = true): string => {
    const ratio = value / target;
    if (higher_is_better) {
      if (ratio >= 1) return 'text-green-600';
      if (ratio >= 0.8) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      if (ratio <= 0.5) return 'text-green-600';
      if (ratio <= 0.8) return 'text-yellow-600';
      return 'text-red-600';
    }
  };

  const getStatusBadgeColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      case 'down': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Dashboard Error
              </h3>
              <p className="text-sm text-red-700 mt-2">{error}</p>
              <button 
                onClick={fetchDashboardData}
                className="mt-4 bg-red-800 text-white px-4 py-2 rounded-md text-sm hover:bg-red-900"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center text-gray-500">No dashboard data available</div>
      </div>
    );
  }

  const { mvp_metrics, performance_metrics, system_health } = dashboardData;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">MVP Success Metrics</h1>
          <p className="text-gray-600 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(system_health.status)}`}>
            System {system_health.status}
          </div>
          <button 
            onClick={fetchDashboardData}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* MVP Success Metrics */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>User Onboarding</span>
              <span className={`text-2xl font-bold ${getMetricStatusColor(mvp_metrics.onboarding_completion_rate, mvp_metrics.targets.onboarding_completion_rate)}`}>
                {mvp_metrics.onboarding_completion_rate.toFixed(1)}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Target: {mvp_metrics.targets.onboarding_completion_rate}%</span>
                <span className={mvp_metrics.onboarding_completion_rate >= mvp_metrics.targets.onboarding_completion_rate ? 'text-green-600' : 'text-red-600'}>
                  {mvp_metrics.onboarding_completion_rate >= mvp_metrics.targets.onboarding_completion_rate ? '✅ Met' : '❌ Below'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${mvp_metrics.onboarding_completion_rate >= mvp_metrics.targets.onboarding_completion_rate ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(mvp_metrics.onboarding_completion_rate, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Percentage of users who complete initial workflow creation
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Workflow Persistence</span>
              <span className={`text-2xl font-bold ${getMetricStatusColor(mvp_metrics.workflow_persistence_rate, mvp_metrics.targets.workflow_persistence_rate)}`}>
                {mvp_metrics.workflow_persistence_rate.toFixed(1)}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Target: {mvp_metrics.targets.workflow_persistence_rate}%</span>
                <span className={mvp_metrics.workflow_persistence_rate >= mvp_metrics.targets.workflow_persistence_rate ? 'text-green-600' : 'text-red-600'}>
                  {mvp_metrics.workflow_persistence_rate >= mvp_metrics.targets.workflow_persistence_rate ? '✅ Met' : '❌ Below'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${mvp_metrics.workflow_persistence_rate >= mvp_metrics.targets.workflow_persistence_rate ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(mvp_metrics.workflow_persistence_rate, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Percentage of workflows that remain active after creation
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Deployment Success</span>
              <span className={`text-2xl font-bold ${getMetricStatusColor(mvp_metrics.deployment_success_rate, mvp_metrics.targets.deployment_success_rate)}`}>
                {mvp_metrics.deployment_success_rate.toFixed(1)}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Target: {mvp_metrics.targets.deployment_success_rate}%</span>
                <span className={mvp_metrics.deployment_success_rate >= mvp_metrics.targets.deployment_success_rate ? 'text-green-600' : 'text-red-600'}>
                  {mvp_metrics.deployment_success_rate >= mvp_metrics.targets.deployment_success_rate ? '✅ Met' : '❌ Below'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${mvp_metrics.deployment_success_rate >= mvp_metrics.targets.deployment_success_rate ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(mvp_metrics.deployment_success_rate, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Percentage of workflows successfully deployed to n8n
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Average Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getMetricStatusColor(performance_metrics.avg_response_time, 2000, false)}`}>
              {performance_metrics.avg_response_time.toFixed(0)}ms
            </div>
            <p className="text-xs text-gray-500 mt-1">Target: &lt;2000ms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">P95 Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getMetricStatusColor(performance_metrics.p95_response_time, 5000, false)}`}>
              {performance_metrics.p95_response_time.toFixed(0)}ms
            </div>
            <p className="text-xs text-gray-500 mt-1">Target: &lt;5000ms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getMetricStatusColor(performance_metrics.error_rate * 100, 5, false)}`}>
              {(performance_metrics.error_rate * 100).toFixed(2)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Target: &lt;5%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">System Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getMetricStatusColor(performance_metrics.uptime_percentage, 99.9)}`}>
              {performance_metrics.uptime_percentage.toFixed(2)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Target: &gt;99.9%</p>
          </CardContent>
        </Card>
      </div>

      {/* Service Health */}
      <Card>
        <CardHeader>
          <CardTitle>Service Health Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {system_health.services.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium text-sm">{service.service}</div>
                  <div className="text-xs text-gray-500">{service.response_time_ms}ms</div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(service.status)}`}>
                  {service.status}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {system_health.alerts && system_health.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {system_health.alerts.map((alert, index) => (
                <div key={index} className={`p-3 rounded-lg border-l-4 ${
                  alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                  alert.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                  'border-blue-500 bg-blue-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`font-medium text-sm ${
                        alert.severity === 'critical' ? 'text-red-800' :
                        alert.severity === 'warning' ? 'text-yellow-800' :
                        'text-blue-800'
                      }`}>
                        {alert.message}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.severity.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MVP Success Summary */}
      <Card>
        <CardHeader>
          <CardTitle>MVP Success Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-3">Success Criteria Status</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">User Onboarding ≥70%</span>
                  <span className={mvp_metrics.onboarding_completion_rate >= 70 ? 'text-green-600' : 'text-red-600'}>
                    {mvp_metrics.onboarding_completion_rate >= 70 ? '✅' : '❌'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Workflow Persistence ≥90%</span>
                  <span className={mvp_metrics.workflow_persistence_rate >= 90 ? 'text-green-600' : 'text-red-600'}>
                    {mvp_metrics.workflow_persistence_rate >= 90 ? '✅' : '❌'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Deployment Success ≥80%</span>
                  <span className={mvp_metrics.deployment_success_rate >= 80 ? 'text-green-600' : 'text-red-600'}>
                    {mvp_metrics.deployment_success_rate >= 80 ? '✅' : '❌'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">System Uptime ≥99.9%</span>
                  <span className={performance_metrics.uptime_percentage >= 99.9 ? 'text-green-600' : 'text-red-600'}>
                    {performance_metrics.uptime_percentage >= 99.9 ? '✅' : '❌'}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-3">Overall MVP Status</h4>
              <div className="text-center">
                {(() => {
                  const criteraMet = [
                    mvp_metrics.onboarding_completion_rate >= 70,
                    mvp_metrics.workflow_persistence_rate >= 90,
                    mvp_metrics.deployment_success_rate >= 80,
                    performance_metrics.uptime_percentage >= 99.9
                  ].filter(Boolean).length;
                  
                  if (criteraMet === 4) {
                    return (
                      <div className="text-green-600">
                        <div className="text-4xl font-bold">🎉</div>
                        <div className="text-lg font-semibold">MVP SUCCESS!</div>
                        <div className="text-sm">All criteria met</div>
                      </div>
                    );
                  } else if (criteraMet >= 2) {
                    return (
                      <div className="text-yellow-600">
                        <div className="text-4xl font-bold">⚠️</div>
                        <div className="text-lg font-semibold">Partial Success</div>
                        <div className="text-sm">{criteraMet}/4 criteria met</div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="text-red-600">
                        <div className="text-4xl font-bold">❌</div>
                        <div className="text-lg font-semibold">Needs Improvement</div>
                        <div className="text-sm">{criteraMet}/4 criteria met</div>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MVPMetricsDashboard;