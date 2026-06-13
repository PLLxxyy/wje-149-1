import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { AdminStats, HourAdjustment } from '../types';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tab, setTab] = useState<'overview' | 'coaches' | 'students'>('overview');
  const [coaches, setCoaches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [adjustModal, setAdjustModal] = useState<{ open: boolean; student: any | null }>({ open: false, student: null });
  const [adjustAction, setAdjustAction] = useState<'recharge' | 'deduct'>('recharge');
  const [adjustHours, setAdjustHours] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustments, setAdjustments] = useState<HourAdjustment[]>([]);
  const [showHistory, setShowHistory] = useState<any | null>(null);

  const refreshStudents = () => {
    api.admin.getStudents().then(setStudents);
  };

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

  const openAdjustModal = (student: any) => {
    setAdjustModal({ open: true, student });
    setAdjustAction('recharge');
    setAdjustHours('');
    setAdjustReason('');
    setAdjustments([]);
    setShowHistory(null);
  };

  const closeAdjustModal = () => {
    setAdjustModal({ open: false, student: null });
    setShowHistory(null);
  };

  const handleAdjustSubmit = async () => {
    if (!adjustModal.student) return;
    const hoursNum = parseInt(adjustHours, 10);
    if (!hoursNum || hoursNum <= 0) {
      alert('请输入有效的正整数');
      return;
    }
    setAdjustLoading(true);
    try {
      await api.admin.adjustHours(adjustModal.student.id, {
        action: adjustAction,
        hours: hoursNum,
        reason: adjustReason,
      });
      alert(adjustAction === 'recharge' ? '充值成功' : '扣减成功');
      refreshStudents();
      closeAdjustModal();
    } catch (err: any) {
      alert(err.message || '操作失败');
    } finally {
      setAdjustLoading(false);
    }
  };

  const toggleHistory = async (student: any) => {
    if (showHistory && showHistory.id === student.id) {
      setShowHistory(null);
      setAdjustments([]);
      return;
    }
    setShowHistory(student);
    try {
      const list = await api.admin.getHourAdjustments(student.id);
      setAdjustments(list);
    } catch (err: any) {
      alert(err.message || '获取调整记录失败');
    }
  };

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
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <React.Fragment key={s.id}>
                    <tr>
                      <td style={{ fontWeight: 500 }}>{s.name}</td>
                      <td>{s.phone || '-'}</td>
                      <td>{s.total_hours || 0}</td>
                      <td>{s.used_hours || 0}</td>
                      <td>{(s.total_hours || 0) - (s.used_hours || 0)}</td>
                      <td>{s.completed_lessons}</td>
                      <td>{s.created_at}</td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ marginRight: 8 }}
                          onClick={() => openAdjustModal(s)}
                        >
                          调整学时
                        </button>
                        <button
                          className="btn btn-default btn-sm"
                          onClick={() => toggleHistory(s)}
                        >
                          {showHistory && showHistory.id === s.id ? '收起记录' : '调整记录'}
                        </button>
                      </td>
                    </tr>
                    {showHistory && showHistory.id === s.id && (
                      <tr>
                        <td colSpan={8} style={{ background: '#fafafa', padding: 0 }}>
                          <div style={{ padding: '12px 20px' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#333' }}>
                              学时调整记录
                            </div>
                            {adjustments.length === 0 ? (
                              <p style={{ color: '#999', fontSize: 13, padding: '10px 0' }}>暂无调整记录</p>
                            ) : (
                              <table style={{ width: '100%', fontSize: 13 }}>
                                <thead>
                                  <tr style={{ background: '#f0f0f0' }}>
                                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>时间</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>操作</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>学时</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>变更前</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>变更后</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>操作人</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>备注</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {adjustments.map(a => (
                                    <tr key={a.id}>
                                      <td style={{ padding: '6px 10px' }}>{a.created_at}</td>
                                      <td style={{ padding: '6px 10px' }}>
                                        <span style={{
                                          color: a.action === 'recharge' ? '#52c41a' : '#ff4d4f',
                                          fontWeight: 600,
                                        }}>
                                          {a.action === 'recharge' ? '充值' : '扣减'}
                                        </span>
                                      </td>
                                      <td style={{ padding: '6px 10px' }}>{a.hours}</td>
                                      <td style={{ padding: '6px 10px' }}>{a.before_total}</td>
                                      <td style={{ padding: '6px 10px' }}>{a.after_total}</td>
                                      <td style={{ padding: '6px 10px' }}>{a.admin_name}</td>
                                      <td style={{ padding: '6px 10px' }}>{a.reason || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adjustModal.open && adjustModal.student && (
        <div className="modal-overlay" onClick={closeAdjustModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ fontSize: 16, fontWeight: 600 }}>
                调整学时 - {adjustModal.student.name}
              </span>
              <span
                className="modal-close"
                onClick={closeAdjustModal}
                style={{ cursor: 'pointer', color: '#999', fontSize: 18 }}
              >
                ×
              </span>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>当前学时</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>
                  总学时 {adjustModal.student.total_hours || 0}，已练 {adjustModal.student.used_hours || 0}，剩余 {(adjustModal.student.total_hours || 0) - (adjustModal.student.used_hours || 0)}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>操作类型</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="action"
                      checked={adjustAction === 'recharge'}
                      onChange={() => setAdjustAction('recharge')}
                      style={{ marginRight: 6 }}
                    />
                    <span style={{ color: '#52c41a', fontWeight: 500 }}>充值（增加学时）</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="action"
                      checked={adjustAction === 'deduct'}
                      onChange={() => setAdjustAction('deduct')}
                      style={{ marginRight: 6 }}
                    />
                    <span style={{ color: '#ff4d4f', fontWeight: 500 }}>扣减（减少学时）</span>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>学时数量（正整数）</div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="input"
                  placeholder="请输入学时数"
                  value={adjustHours}
                  onChange={e => setAdjustHours(e.target.value.replace(/[^0-9]/g, ''))}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14 }}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>备注（可选）</div>
                <textarea
                  className="input"
                  placeholder="请输入调整原因"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14, resize: 'vertical' }}
                />
              </div>

              {adjustAction === 'deduct' && adjustHours && parseInt(adjustHours, 10) > 0 && (
                <div style={{ fontSize: 13, color: '#faad14', marginTop: -4, marginBottom: 8 }}>
                  扣减后总学时将变为 {Math.max(0, (adjustModal.student.total_hours || 0) - parseInt(adjustHours, 10))}
                </div>
              )}
              {adjustAction === 'recharge' && adjustHours && parseInt(adjustHours, 10) > 0 && (
                <div style={{ fontSize: 13, color: '#52c41a', marginTop: -4, marginBottom: 8 }}>
                  充值后总学时将变为 {(adjustModal.student.total_hours || 0) + parseInt(adjustHours, 10)}
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid #f0f0f0' }}>
              <button
                className="btn btn-default"
                onClick={closeAdjustModal}
                disabled={adjustLoading}
                style={{ padding: '6px 16px', border: '1px solid #d9d9d9', background: '#fff', borderRadius: 4, cursor: 'pointer' }}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAdjustSubmit}
                disabled={adjustLoading}
                style={{
                  padding: '6px 16px',
                  border: 'none',
                  background: adjustAction === 'recharge' ? '#52c41a' : '#ff4d4f',
                  color: '#fff',
                  borderRadius: 4,
                  cursor: adjustLoading ? 'not-allowed' : 'pointer',
                  opacity: adjustLoading ? 0.6 : 1,
                }}
              >
                {adjustLoading ? '提交中...' : (adjustAction === 'recharge' ? '确认充值' : '确认扣减')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
