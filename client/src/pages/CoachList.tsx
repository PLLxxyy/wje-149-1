import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Coach } from '../types';

const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export default function CoachList() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.coaches.list().then(setCoaches).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container"><p>加载中...</p></div>;

  return (
    <div className="container">
      <h2 className="page-title">选择教练</h2>
      {coaches.length === 0 ? (
        <div className="empty-state">
          <p>暂无可约教练</p>
        </div>
      ) : (
        <div className="coach-grid">
          {coaches.map(coach => (
            <div
              key={coach.id}
              className="coach-card"
              onClick={() => navigate(`/coaches/${coach.id}`)}
            >
              <div className="coach-name">{coach.name}</div>
              <div className="coach-info">
                <span>驾龄 <strong>{coach.driving_years}</strong> 年</span>
                <span className="rating">
                  {'★'.repeat(Math.round(coach.rating))} {coach.rating.toFixed(1)}
                </span>
                <span>评价 {coach.rating_count} 条</span>
              </div>
              <div className="coach-info">
                <span>可约时段 {coach.schedules.filter(s => s.is_active).length} 个</span>
              </div>
              <div className="coach-desc">{coach.description || '暂无简介'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
