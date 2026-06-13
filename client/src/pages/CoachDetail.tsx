import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Coach, Review } from '../types';

const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const timeSlots = ['08:00-09:00', '09:00-10:00', '10:00-11:00', '14:00-15:00', '15:00-16:00', '16:00-17:00'];

function getNext7Days(): { date: string; label: string; dayOfWeek: number; dayName: string }[] {
  const days: { date: string; label: string; dayOfWeek: number; dayName: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    days.push({
      date: `${y}-${m}-${dd}`,
      label: `${m}/${dd}`,
      dayOfWeek: d.getDay(),
      dayName: dayNames[d.getDay()],
    });
  }
  return days;
}

export default function CoachDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [showModal, setShowModal] = useState(false);

  const dates = getNext7Days();

  useEffect(() => {
    if (id) {
      api.coaches.detail(id).then(c => {
        setCoach(c);
        if (dates.length > 0) setSelectedDate(dates[0].date);
      }).finally(() => setLoading(false));
    }
  }, [id]);

  useEffect(() => {
    if (id && selectedDate) {
      api.bookings.bookedSlots(id, selectedDate).then(setBookedSlots);
    }
  }, [id, selectedDate]);

  if (loading) return <div className="container"><p>加载中...</p></div>;
  if (!coach) return <div className="container"><p>教练不存在</p></div>;

  const currentDayOfWeek = dates.find(d => d.date === selectedDate)?.dayOfWeek ?? 0;
  const availableSlots = coach.schedules.filter(
    s => s.day_of_week === currentDayOfWeek && s.is_active
  );

  const handleBook = async () => {
    if (!selectedDate || !selectedSlot || !id) return;
    setMsg('');
    setBookingLoading(true);
    try {
      const schedule = coach.schedules.find(
        s => s.day_of_week === currentDayOfWeek && s.time_slot === selectedSlot
      );
      if (!schedule) {
        setMsg('该时段不可预约');
        return;
      }
      await api.bookings.create({
        coach_id: id,
        schedule_id: schedule.id,
        booking_date: selectedDate,
        time_slot: selectedSlot,
      });
      setShowModal(true);
    } catch (err: any) {
      setMsg(err.message || '预约失败');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <div className="coach-name" style={{ fontSize: 22, marginBottom: 12 }}>{coach.name}</div>
        <div className="coach-info" style={{ marginBottom: 8 }}>
          <span>驾龄 <strong>{coach.driving_years}</strong> 年</span>
          <span className="rating">
            {'★'.repeat(Math.round(coach.rating))} {coach.rating.toFixed(1)}
          </span>
          <span>评价 {coach.rating_count} 条</span>
          <span>联系电话 {coach.phone || '未公开'}</span>
        </div>
        <div className="coach-desc">{coach.description || '暂无简介'}</div>
      </div>

      <div className="card">
        <div className="card-title">预约练车</div>
        {msg && <div className="error-msg">{msg}</div>}

        <div className="calendar-header">
          <h3>选择日期</h3>
        </div>
        <div className="calendar-dates">
          {dates.map(d => (
            <div
              key={d.date}
              className={`date-btn ${selectedDate === d.date ? 'selected' : ''}`}
              onClick={() => { setSelectedDate(d.date); setSelectedSlot(''); }}
            >
              <span className="day-name">{d.dayName}</span>
              {d.label}
            </div>
          ))}
        </div>

        <div className="card-title" style={{ marginTop: 16 }}>选择时段</div>
        <div className="time-slots-container">
          {timeSlots.map(slot => {
            const isAvailable = availableSlots.some(s => s.time_slot === slot);
            const isBooked = bookedSlots.includes(slot);
            const isSelected = selectedSlot === slot;

            return (
              <div
                key={slot}
                className={`time-slot ${isBooked ? 'booked' : isAvailable ? (isSelected ? 'selected' : 'active') : 'inactive'}`}
                onClick={() => {
                  if (isAvailable && !isBooked) setSelectedSlot(slot);
                }}
              >
                {slot}
                {isBooked ? ' (已约)' : ''}
              </div>
            );
          })}
        </div>

        {availableSlots.length === 0 && (
          <p style={{ color: '#999', marginTop: 12 }}>该日期教练未设置可约时段</p>
        )}

        <div style={{ marginTop: 20 }}>
          <button
            className="btn btn-primary"
            disabled={!selectedSlot || bookingLoading}
            onClick={handleBook}
            style={{ width: 'auto', padding: '10px 40px' }}
          >
            {bookingLoading ? '预约中...' : '确认预约'}
          </button>
        </div>
      </div>

      {coach.reviews && coach.reviews.length > 0 && (
        <div className="card">
          <div className="card-title">学员评价</div>
          {coach.reviews.map((r: Review) => (
            <div key={r.id} className="review-card">
              <div className="review-header">
                <span className="rating">{'★'.repeat(r.rating)} {r.rating}分</span>
                <span className="review-meta">{r.reviewer_name} | {r.created_at}</span>
              </div>
              <div className="review-comment">{r.comment || '未填写评语'}</div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); navigate('/my-bookings'); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>预约成功</h3>
            <p>您已成功预约 <strong>{coach.name}</strong> 的练车课程</p>
            <p>日期：{selectedDate}</p>
            <p>时段：{selectedSlot}</p>
            <p style={{ color: '#999', fontSize: 13, marginTop: 8 }}>请按时到达练车地点，练车前进行签到确认。</p>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => { setShowModal(false); navigate('/my-bookings'); }}>
                查看我的课程
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
