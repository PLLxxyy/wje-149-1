import React from 'react';
import { useAuth } from '../context/AuthContext';

const roleNames: Record<string, string> = {
  coach: '教练',
  student: '学员',
  admin: '管理员',
};

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <h1>驾校练车预约系统</h1>
      {user && (
        <div className="header-right">
          <span>{user.name} ({roleNames[user.role] || user.role})</span>
          <button onClick={logout}>退出登录</button>
        </div>
      )}
    </header>
  );
}
