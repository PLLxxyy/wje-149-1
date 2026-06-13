import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { AdminStats } from '../types';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tab, setTab] = useState<'overview' | 'coaches' | 'students'>('overview');
  const [coaches, setCoaches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.admin.getStats(),
      api.admin.getCoaches(),
      api.admin.getStudents(),
    ]).then(([s, c, st]) => {
      setStats(s);
      setCoaches(c);
      setStudents(st);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container"><p>加载中...</p></div>;
  if (!stats) return <div className="container"><p>加载失败</p></div>;

  return (
    <div className="container">
      <h2 className="page-title">管理后台</h2>

      <div className="tabs">
        <div className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>数据总览</div>
        <div className={`tab ${tab === 'coaches' ? 'active' : ''}`} onClick={() => setTab('coaches')}>教练管理</div>
        <div className={`tab ${tab === 'students' ? 'active' : ''}`} onClick={() => setTab('students')}>学员管理</div>
      </div>

      {tab === 'overview' && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.coachCount}</div>
              <div className="stat-label">教练总数</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.studentCount}</div>
              <div className="stat-label">学员总数</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalBookings}</div>
              <div className="stat-label">总预约数</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.completedBookings}</div>
              <div className="stat-label">已完成课时</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.bookingRate}%</div>
              <div className="stat-label">预约率</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.pendingBookings}</div>
              <div className="stat-label">待确认</div>
            </div>
          </div>

          <div className="two-col">
            <div className="card">
              <div className="card-title">预约状态分布</div>
              <div style={{ marginTop: 12 }}>
                {[
                  { label: '待确认', count: stats.pendingBookings, color: '#fa8c16' },
                  { label: '已确认', count: stats.confirmedBookings, color: '#1890ff' },
                  { label: '已完成', count: stats.completedBookings, color: '#52c41a' },
                  { label: '已取消', count: stats.cancelledBookings, color: '#ff4d4f' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ width: 60, fontSize: 13, color: '#666' }}>{item.label}</span>
                    <div style={{
                      flex: 1,
                      height: 20,
                      background: '#f0f0f0',
                      borderRadius: 4,
                      overflow: 'hidden',
                      marginLeft: 8,
                      marginRight: 8,
                    }}>
                      <div style={{
                        width: `${stats.totalBookings > 0 ? (item.count / stats.totalBookings) * 100 : 0}%`,
                        height: '100%',
                        background: item.color,
                        borderRadius: 4,
                        transition: 'width 0.3s',
                      }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, minWidth: 30, textAlign: 'right' }}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-title">近7日预约趋势</div>
              <div style={{ marginTop: 12 }}>
                {stats.dailyStats.length === 0 ? (
                  <p style={{ color: '#999', fontSize: 13 }}>暂无数据</p>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150 }}>
                    {stats.dailyStats.map(d => {
                      const maxCount = Math.max(...stats.dailyStats.map(s => s.count), 1);
                      const height = (d.count / maxCount) * 120;
                      return (
                        <div key={d.date} style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{d.count}</div>
                          <div style={{
                            height: Math.max(height, 4),
                            background: 'linear-gradient(180deg, #1890ff, #40a9ff)',
                            borderRadius: '4px 4px 0 0',
                            margin: '0 2px',
                          }} />
                          <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
                            {d.date.slice(5)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">教练带教排行</div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>排名</th>
                    <th>教练</th>
                    <th>驾龄</th>
                    <th>评分</th>
                    <th>在教学员</th>
                    <th>已完成课时</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.coachRanking.map((c, i) => (
                    <tr key={c.name}>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: i < 3 ? ['#faad14', '#d9d9d9', '#d48806'][i] : '#f0f0f0',
                          color: i < 3 ? 'white' : '#666',
                          textAlign: 'center',
                          lineHeight: '24px',
                          fontSize: 12,
                          fontWeight: 600,
                        }}>
                          {i + 1}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td>{c.driving_years}年</td>
                      <td className="rating">{c.rating.toFixed(1)}</td>
                      <td>{c.total_students}</td>
                      <td>{c.completed_lessons}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'coaches' && (
        <div className="card">
          <div className="card-title">教练列表</div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>电话</th>
                  <th>驾龄</th>
                  <th>评分</th>
                  <th>在教学员</th>
                  <th>已完成课时</th>
                  <th>注册时间</th>
                </tr>
              </thead>
              <tbody>
                {coaches.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td>{c.phone || '-'}</td>
                    <td>{c.driving_years}年</td>
                    <td className="rating">{c.rating.toFixed(1)} ({c.rating_count}条)</td>
                    <td>{c.total_students}</td>
                    <td>{c.completed_lessons}</td>
                    <td>{c.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'students' && (
        <div className="card">
          <div className="card-title">学员列表</div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>电话</th>
                  <th>总学时</th>
                  <th>已练</th>
                  <th>剩余</th>
                  <th>已完成课时</th>
                  <th>注册时间</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td>{s.phone || '-'}</td>
                    <td>{s.total_hours || 0}</td>
                    <td>{s.used_hours || 0}</td>
                    <td>{(s.total_hours || 0) - (s.used_hours || 0)}</td>
                    <td>{s.completed_lessons}</td>
                    <td>{s.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
