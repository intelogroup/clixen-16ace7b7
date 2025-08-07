import React, { useState } from 'react';

export default function ModernDashboard() {
  const [selectedProject, setSelectedProject] = useState(0);

  const projects = [
    { name: 'Email Automation', workflows: 3, status: 'active' },
    { name: 'Data Pipeline', workflows: 5, status: 'active' },
    { name: 'Social Media Bot', workflows: 2, status: 'draft' }
  ];

  const workflows = [
    { name: 'Daily Email Digest', status: 'active', executions: 156 },
    { name: 'Slack Notifications', status: 'active', executions: 89 },
    { name: 'File Backup', status: 'completed', executions: 45 },
    { name: 'Lead Processing', status: 'draft', executions: 0 },
    { name: 'Invoice Generation', status: 'active', executions: 234 }
  ];

  const stats = [
    { label: 'Total Workflows', value: '12', icon: '🔄', color: '#8b5cf6' },
    { label: 'Active Projects', value: '3', icon: '📊', color: '#3b82f6' },
    { label: 'Success Rate', value: '94%', icon: '✅', color: '#10b981' },
    { label: 'Executions Today', value: '1.2k', icon: '⚡', color: '#f59e0b' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'completed': return '#3b82f6';
      case 'draft': return '#f59e0b';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 25%, #2d1b69 50%, #1a1a3e 75%, #0f0f23 100%)',
      fontFamily: 'Inter, sans-serif',
      color: 'white'
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '20px 0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              ⚡
            </div>
            <div>
              <h1 style={{ margin: '0', fontSize: '24px' }}>Clixen AI</h1>
              <p style={{ margin: '0', color: '#a0a0a0', fontSize: '14px' }}>AI Workflow Platform</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button style={{
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '10px',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px'
            }}>
              + New Workflow
            </button>
            
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}>
              👤
            </div>
          </div>
        </div>
      </header>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '30px 20px'
      }}>
        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          {stats.map((stat, index) => (
            <div key={index} style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                fontSize: '20px'
              }}>
                ✨
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                marginBottom: '15px'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: `${stat.color}20`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>
                  {stat.icon}
                </div>
                <div style={{ color: '#10b981', fontSize: '12px' }}>
                  +12% ↗
                </div>
              </div>
              
              <h3 style={{
                fontSize: '32px',
                margin: '0 0 5px',
                fontWeight: '700',
                color: stat.color
              }}>
                {stat.value}
              </h3>
              <p style={{
                margin: '0',
                color: '#a0a0a0',
                fontSize: '14px'
              }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '30px'
        }}>
          {/* Projects Sidebar */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px'
            }}>
              <span style={{ fontSize: '20px' }}>⭐</span>
              <h2 style={{ margin: '0', fontSize: '18px' }}>Projects</h2>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {projects.map((project, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedProject(index)}
                  style={{
                    background: selectedProject === index 
                      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))' 
                      : 'rgba(255, 255, 255, 0.05)',
                    border: selectedProject === index 
                      ? '1px solid rgba(139, 92, 246, 0.3)' 
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    color: 'white',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h3 style={{ margin: '0 0 5px', fontSize: '16px' }}>
                        {project.name}
                      </h3>
                      <p style={{ margin: '0', fontSize: '12px', color: '#a0a0a0' }}>
                        {project.workflows} workflows
                      </p>
                    </div>
                    {selectedProject === index && (
                      <span style={{ fontSize: '16px' }}>→</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Workflows List */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>🔄</span>
                <h2 style={{ margin: '0', fontSize: '18px' }}>Workflows</h2>
              </div>
              <span style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                color: '#a0a0a0'
              }}>
                {workflows.length} total
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {workflows.map((workflow, index) => (
                <div
                  key={index}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px'
                      }}>
                        🤖
                      </div>
                      
                      <div>
                        <h3 style={{ margin: '0 0 5px', fontSize: '16px' }}>
                          {workflow.name}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            background: `${getStatusColor(workflow.status)}20`,
                            color: getStatusColor(workflow.status),
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textTransform: 'capitalize'
                          }}>
                            {workflow.status}
                          </span>
                          <span style={{ fontSize: '12px', color: '#a0a0a0' }}>
                            {workflow.executions} executions
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '16px', color: '#a0a0a0' }}>→</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
