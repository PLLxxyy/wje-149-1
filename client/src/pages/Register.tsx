import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ username: '', password: '', name: '', phone: '', role: 'student' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.password || !form.name) {
      setError('请填写必填项');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err: any) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>注册账号</h2>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>身份</label>
            <select value={form.role} onChange={e => handleChange('role', e.target.value)}>
              <option value="student">学员</option>
              <option value="coach">教练</option>
            </select>
          </div>
          <div className="form-group">
            <label>姓名</label>
            <input
              type="text"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              placeholder="请输入真实姓名"
            />
          </div>
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={form.username}
              onChange={e => handleChange('username', e.target.value)}
              placeholder="请设置用户名"
            />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={form.password}
              onChange={e => handleChange('password', e.target.value)}
              placeholder="请设置密码"
            />
          </div>
          <div className="form-group">
            <label>手机号（选填）</label>
            <input
              type="text"
              value={form.phone}
              onChange={e => handleChange('phone', e.target.value)}
              placeholder="请输入手机号"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '注册中...' : '注 册'}
          </button>
        </form>
        <div className="auth-switch">
          已有账号？<Link to="/login">立即登录</Link>
        </div>
      </div>
    </div>
  );
}
