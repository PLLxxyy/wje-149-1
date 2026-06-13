import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Schedule } from '../types';

const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const timeSlots = ['08:00-09:00', '09:00-10:00', '10:00-11:00', '14:00-15:00', '15:00-16:00', '16:00-17:00'];

interface SlotCell {
  day: number;
  slot: string;
  active: boolean;
  scheduleId?: string;
}

export default function CoachSchedule() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchSchedules = () => {
    api.schedules.list().then(setSchedules).finally(() => setLoading(false));
  };

  useEffect(() => { fetchSchedules(); }, []);

  const getScheduleId = (day: number, slot: string): string | undefined => {
    const s = schedules.find(sc => sc.day_of_week === day && sc.time_slot === slot);
    return s?.id;
  };

  const isActive = (day: number, slot: string): boolean => {
    const s = schedules.find(sc => sc.day_of_week === day && sc.time_slot === slot);
    return s ? s.is_active === 1 : false;
  };

  const toggleSlot = async (day: number, slot: string) => {
    const s = schedules.find(sc => sc.day_of_week === day && sc.time_slot === slot);
    if (s) {
      if (s.is_active) {
        await api.schedules.remove(s.id);
      } else {
        await api.schedules.add({ day_of_week: day, time_slot: slot });
      }
    } else {
      await api.schedules.add({ day_of_week: day, time_slot: slot });
    }
    fetchSchedules();
  };

  const saveAll = async () => {
    setSaving(true);
    setMsg('');
    try {
      const activeSlots: Array<{ day_of_week: number; time_slot: string }> = [];
      for (let day = 0; day <= 6; day++) {
        for (const slot of timeSlots) {
          if (isActive(day, slot)) {
            activeSlots.push({ day_of_week: day, time_slot: slot });
          }
        }
      }
      // Since we toggle individually, this is already saved
      setMsg('排班已保存');
    } catch (err: any) {
      setMsg(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="container"><p>加载中...</p></div>;

  return (
    <div className="container">
      <h2 className="page-title">排班管理</h2>
      <div className="card">
        <p style={{ marginBottom: 16, color: '#666', fontSize: 14 }}>
          点击时段方块切换可约/不可约状态。设置好后，学员可以看到并预约您的可约时段。
        </p>
        {msg && (
          <div style={{
            background: '#f6ffed',
            border: '1px solid #b7eb8f',
            color: '#52c41a',
            padding: '8px 12px',
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 13,
          }}>
            {msg}
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: 600 }}>
            <thead>
              <tr>
                <th>时段</th>
                {dayNames.map((name, i) => (
                  <th key={i} style={{ textAlign: 'center' }}>{name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(slot => (
                <tr key={slot}>
                  <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{slot}</td>
                  {[0, 1, 2, 3, 4, 5, 6].map(day => {
                    const active = isActive(day, slot);
                    return (
                      <td key={day} style={{ textAlign: 'center' }}>
                        <div
                          className={`time-slot ${active ? 'active' : 'inactive'}`}
                          onClick={() => toggleSlot(day, slot)}
                          style={{ display: 'inline-block', cursor: 'pointer' }}
                        >
                          {active ? '可约' : '休息'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <span style={{ color: '#999', fontSize: 13 }}>
            共 {schedules.filter(s => s.is_active).length} 个可约时段
          </span>
        </div>
      </div>
    </div>
  );
}
