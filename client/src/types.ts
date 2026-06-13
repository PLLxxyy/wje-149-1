export interface User {
  id: string;
  username: string;
  name: string;
  role: 'coach' | 'student' | 'admin';
  phone: string;
}

export interface Coach {
  id: string;
  name: string;
  phone: string;
  driving_years: number;
  rating: number;
  rating_count: number;
  description: string;
  total_students: number;
  schedules: Schedule[];
  reviews?: Review[];
}

export interface Schedule {
  id: string;
  day_of_week: number;
  time_slot: string;
  is_active: number;
}

export interface Booking {
  id: string;
  student_id: string;
  coach_id: string;
  schedule_id: string;
  booking_date: string;
  time_slot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  student_signed: number;
  coach_signed: number;
  hours_earned: number;
  created_at: string;
  coach_name?: string;
  coach_phone?: string;
  student_name?: string;
  student_phone?: string;
}

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_name?: string;
  reviewer_role?: string;
  booking_date?: string;
  time_slot?: string;
}

export interface StudentHours {
  total_hours: number;
  used_hours: number;
}

export interface AdminStats {
  coachCount: number;
  studentCount: number;
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  bookingRate: number;
  totalSchedules: number;
  coachRanking: Array<{
    name: string;
    rating: number;
    total_students: number;
    driving_years: number;
    completed_lessons: number;
  }>;
  dailyStats: Array<{ date: string; count: number }>;
}
