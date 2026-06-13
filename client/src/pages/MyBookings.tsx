import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Booking } from '../types';

const statusMap: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  completed: '已完成',
  cancelled: '已取消',
};

const statusBadge: Record<string, string> = {
  pending: 'badge-pending',
  confirmed: 'badge-confirmed',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
};

export default function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [reviewModal, setReviewModal] = useState<{ bookingId: string; type: 'student' | 'coach' } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchBookings = () => {
    if (!user) return;
    const fetcher = user.role === 'coach' ? api.bookings.coachBookings : api.bookings.myBookings;
    fetcher().then(setBookings).finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, [user]);

  const handleSign = async (id: string) => {
    try {
      await api.bookings.sign(id);
      fetchBookings();
    } catch (err: any) {
      alert(err.message || '签到失败');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('确定取消该预约吗？')) return;
    try {
      await api.bookings.cancel(id);
      fetchBookings();
    } catch (err: any) {
      alert(err.message || '取消失败');
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewModal) return;
    setReviewLoading(true);
    try {
      await api.reviews.create({
        booking_id: reviewModal.bookingId,
        rating,
        comment,
      });
      setReviewModal(null);
      setComment('');
      setRating(5);
      fetchBookings();
    } catch (err: any) {
      alert(err.message || '评价失败');
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) return <div className="container"><p>加载中...</p></div>;

  const filtered = bookings.filter(b => {
    if (tab === 'upcoming') return b.status === 'pending' || b.status === 'confirmed';
    if (tab === 'completed') return b.status === 'completed';
    return true;
  });

  const isStudent = user?.role === 'student';

  return (
    <div className="container">
      <h2 className="page-title">{isStudent ? '我的课程' : '预约管理'}</h2>

      <div className="tabs">
        <div className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>全部</div>
        <div className={`tab ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => setTab('upcoming')}>待进行</div>
        <div className={`tab ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')}>已完成</div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>暂无预约记录</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>时段</th>
                <th>{isStudent ? '教练' : '学员'}</th>
                <th>状态</th>
                <th>{isStudent ? '学员签到' : '教练签到'}</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id}>
                  <td>{b.booking_date}</td>
                  <td>{b.time_slot}</td>
                  <td>{isStudent ? b.coach_name : b.student_name}</td>
                  <td><span className={`badge ${statusBadge[b.status]}`}>{statusMap[b.status]}</span></td>
                  <td>
                    {isStudent
                      ? (b.student_signed ? '已签到' : '未签到')
                      : (b.coach_signed ? '已签到' : '未签到')
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {b.status === 'pending' && isStudent && !b.student_signed && (
                        <button className="btn btn-success btn-sm" onClick={() => handleSign(b.id)}>签到</button>
                      )}
                      {b.status === 'confirmed' && isStudent && !b.student_signed && (
                        <button className="btn btn-success btn-sm" onClick={() => handleSign(b.id)}>签到</button>
                      )}
                      {b.status === 'pending' && !isStudent && !b.coach_signed && (
                        <button className="btn btn-success btn-sm" onClick={() => handleSign(b.id)}>确认签到</button>
                      )}
                      {b.status === 'confirmed' && !isStudent && !b.coach_signed && (
                        <button className="btn btn-success btn-sm" onClick={() => handleSign(b.id)}>确认签到</button>
                      )}
                      {b.status === 'completed' && (
                        <button
                          className="btn btn-warning btn-sm"
                          onClick={() => setReviewModal({ bookingId: b.id, type: isStudent ? 'student' : 'coach' })}
                        >
                          评价
                        </button>
                      )}
                      {(b.status === 'pending' || b.status === 'confirmed') && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleCancel(b.id)}>取消</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reviewModal && (
        <div className="modal-overlay" onClick={() => setReviewModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{isStudent ? '评价教练' : '评价学员'}</h3>
            <div className="form-group">
              <label>评分</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <span
                    key={n}
                    style={{
                      fontSize: 28,
                      cursor: 'pointer',
                      color: n <= rating ? '#faad14' : '#d9d9d9',
                    }}
                    onClick={() => setRating(n)}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>{isStudent ? '评语' : '学员表现备注'}</label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={isStudent ? '请输入您对教练的评价...' : '请输入对学员本次表现的备注...'}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-default" onClick={() => setReviewModal(null)}>取消</button>
              <button className="btn btn-primary" disabled={reviewLoading} onClick={handleSubmitReview}>
                {reviewLoading ? '提交中...' : '提交评价'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
