import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

interface StudentInfo {
  id: string;
  name: string;
  phone: string;
  total_hours: number;
  used_hours: number;
  coach_notes: Array<{
    rating: number;
    comment: string;
    created_at: string;
    booking_date: string;
    time_slot: string;
  }>;
}

export default function CoachStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      api.coaches.getStudents(user.id).then(setStudents).finally(() => setLoading(false));
    }
  }, [user]);

  if (loading) return <div className="container"><p>加载中...</p></div>;

  return (
    <div className="container">
      <h2 className="page-title">我的学员</h2>
      {students.length === 0 ? (
        <div className="empty-state">
          <p>暂无学员</p>
        </div>
      ) : (
        students.map(s => (
          <div key={s.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>电话：{s.phone || '未填写'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, color: '#1890ff', fontWeight: 600 }}>
                  已练 {s.used_hours}/{s.total_hours} 小时
                </div>
                <div className="progress-bar" style={{ width: 120 }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${s.total_hours > 0 ? (s.used_hours / s.total_hours) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {expandedId === s.id && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                <div className="card-title">我的备注</div>
                {s.coach_notes.length === 0 ? (
                  <p style={{ color: '#999', fontSize: 13 }}>暂无备注</p>
                ) : (
                  s.coach_notes.map((note, i) => (
                    <div key={i} className="review-card">
                      <div className="review-header">
                        <span className="rating">{'★'.repeat(note.rating)}</span>
                        <span className="review-meta">{note.booking_date} {note.time_slot}</span>
                      </div>
                      <div className="review-comment">{note.comment || '未填写'}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
