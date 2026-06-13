import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Nav() {
  const { user } = useAuth();
  if (!user) return null;

  const links: Array<{ to: string; label: string }> = [];

  if (user.role === 'student') {
    links.push(
      { to: '/coaches', label: '教练列表' },
      { to: '/my-bookings', label: '我的课程' },
      { to: '/my-profile', label: '个人中心' },
    );
  } else if (user.role === 'coach') {
    links.push(
      { to: '/coach-schedule', label: '排班管理' },
      { to: '/coach-bookings', label: '预约管理' },
      { to: '/coach-students', label: '我的学员' },
    );
  } else if (user.role === 'admin') {
    links.push(
      { to: '/admin', label: '数据总览' },
    );
  }

  return (
    <div className="container">
      <nav className="nav-bar">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
