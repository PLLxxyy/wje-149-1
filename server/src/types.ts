import { Request } from 'express';

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'coach' | 'student' | 'admin';
  phone: string;
  created_at: string;
}

export interface CoachProfile {
  id: string;
  user_id: string;
  driving_years: number;
  rating: number;
  rating_count: number;
  description: string;
  total_students: number;
}

export interface Schedule {
  id: string;
  coach_id: string;
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
}

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface StudentHours {
  id: string;
  student_id: string;
  total_hours: number;
  used_hours: number;
}

export interface AuthRequest extends Request {
  user?: { id: string; role: string; username: string };
}
