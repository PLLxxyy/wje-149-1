import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Review, StudentHours } from '../types';

export default function StudentProfile() {
  const [hours, setHours] = useState<StudentHours>({ total_hours: 20, used_hours: 0 });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.student.getHours(),
      api.reviews.getStudentReviews(),
    ]).then(([h, r]) => {
      setHours(h);
      setReviews(r);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container"><p>加载中...</p></div>;

  const remaining = hours.total_hours - hours.used_hours;
  const progress = hours.total_hours > 0 ? (hours.used_hours / hours.total_hours) * 100 : 0;

  return (
    <div className="container">
      <h2 className="page-title">个人中心</h2>

      <div className="hours-display">
        <div className="hours-item">
          <div className="hours-value">{hours.total_hours}</div>
          <div className="hours-label">总学时</div>
        </div>
        <div className="hours-item">
          <div className="hours-value" style={{ color: '#52c41a' }}>{hours.used_hours}</div>
          <div className="hours-label">已练</div>
        </div>
        <div className="hours-item">
          <div className="hours-value" style={{ color: '#faad14' }}>{remaining}</div>
          <div className="hours-label">剩余</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
            学时进度 {hours.used_hours}/{hours.total_hours}
          </div>
          <div className="progress-bar" style={{ height: 12 }}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">历次评价</div>
        {reviews.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}>
            <p>暂无评价记录</p>
          </div>
        ) : (
          reviews.map(r => (
            <div key={r.id} className="review-card">
              <div className="review-header">
                <span>
                  <span className="rating">{'★'.repeat(r.rating)} {r.rating}分</span>
                </span>
                <span className="review-meta">
                  {r.booking_date} {r.time_slot} | 评价人：{r.reviewer_name}
                </span>
              </div>
              <div className="review-comment">{r.comment || '未填写评语'}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
