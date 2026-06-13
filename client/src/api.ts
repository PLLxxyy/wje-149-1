const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${url}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || '请求失败');
  }

  return data as T;
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    register: (data: { username: string; password: string; name: string; phone?: string; role?: string }) =>
      request<{ token: string; user: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    me: () => request<any>('/auth/me'),
  },
  coaches: {
    list: () => request<any[]>('/coaches'),
    detail: (id: string) => request<any>(`/coaches/${id}`),
    updateProfile: (data: any) =>
      request<any>('/coaches/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getStudents: (id: string) => request<any[]>(`/coaches/${id}/students`),
  },
  schedules: {
    list: () => request<any[]>('/schedules'),
    add: (data: any) =>
      request<any>('/schedules', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    remove: (id: string) =>
      request<any>(`/schedules/${id}`, { method: 'DELETE' }),
    batchUpdate: (schedules: any[]) =>
      request<any>('/schedules/batch', {
        method: 'POST',
        body: JSON.stringify({ schedules }),
      }),
  },
  bookings: {
    create: (data: any) =>
      request<any>('/bookings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    myBookings: () => request<any[]>('/bookings/my'),
    coachBookings: () => request<any[]>('/bookings/coach'),
    sign: (id: string) =>
      request<any>(`/bookings/${id}/sign`, { method: 'PUT' }),
    cancel: (id: string) =>
      request<any>(`/bookings/${id}/cancel`, { method: 'PUT' }),
    bookedSlots: (coachId: string, date: string) =>
      request<string[]>(`/bookings/booked/${coachId}/${date}`),
  },
  reviews: {
    create: (data: any) =>
      request<any>('/reviews', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getByBooking: (bookingId: string) => request<any[]>(`/reviews/booking/${bookingId}`),
    getStudentReviews: () => request<any[]>('/reviews/student'),
  },
  student: {
    getHours: () => request<any>('/student'),
  },
  admin: {
    getStats: () => request<any>('/admin/stats'),
    getStudents: () => request<any[]>('/admin/students'),
    getCoaches: () => request<any[]>('/admin/coaches'),
    adjustHours: (studentId: string, data: { action: 'recharge' | 'deduct'; hours: number; reason?: string }) =>
      request<any>(`/admin/students/${studentId}/adjust-hours`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getHourAdjustments: (studentId: string) =>
      request<any[]>(`/admin/students/${studentId}/hour-adjustments`),
  },
};
