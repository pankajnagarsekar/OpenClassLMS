
export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin'
}

export enum LessonType {
  VIDEO = 'video',
  PDF = 'pdf',
  TEXT = 'text',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment'
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_verified?: boolean;
  is_active?: boolean;
  createdAt?: string;
  // Admin Stats (Optional)
  stats?: {
    courses_created?: number;
    total_students?: number;
    courses_enrolled?: number;
    avg_completion?: number;
  };
}

export interface Announcement {
  id: number;
  course_id: number;
  title: string;
  message: string;
  createdAt: string;
}

export interface Question {
  id: number;
  lesson_id: number;
  question_text: string;
  options: string[]; 
}

export interface Submission {
  id: number;
  user_id: number;
  lesson_id: number;
  score: number;
  completed_at: string;
}

export interface AssignmentSubmission {
  id: number;
  lesson_id: number;
  user_id: number;
  file_path: string;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  User?: {
    name: string;
    email: string;
  };
}

export interface Lesson {
  id: number;
  course_id: number;
  title: string;
  type: LessonType;
  content_url: string;
  position: number;
  Questions?: Question[];
  Submissions?: Submission[];
  AssignmentSubmissions?: AssignmentSubmission[];
}

export interface Course {
  id: number;
  title: string;
  description: string;
  thumbnail_url: string;
  video_embed_url: string;
  teacher_id: number;
  access_days: number;
  createdAt?: string;
  Teacher?: {
    name: string;
  };
  Lessons?: Lesson[];
}

export interface Enrollment {
  id: number;
  user_id: number;
  course_id: number;
  expires_at: string;
  is_active: boolean;
  enrolled_at: string;
}

export interface DashboardCourse {
  course_id: number;
  title: string;
  thumbnail_url: string;
  total_lessons: number;
  completed_lessons: number;
  progress_percentage: number;
  expires_at: string;
  is_active: boolean;
  certificate_url?: string;
}

export interface GradebookData {
  columns: { id: number; title: string }[];
  rows: {
    student_name: string;
    student_email: string;
    grades: Record<number, number>;
  }[];
}

export interface AdminStats {
  totalUsers: number;
  totalCourses: number;
  totalSubmissions: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SystemSettings {
  ENABLE_PUBLIC_REGISTRATION: boolean;
  REQUIRE_EMAIL_VERIFICATION: boolean;
  MAINTENANCE_MODE: boolean;
  ENABLE_CERTIFICATES: boolean;
  ENABLE_STUDENT_UPLOADS: boolean;
  SHOW_COURSE_ANNOUNCEMENTS: boolean;
  SHOW_FEATURED_COURSES: boolean;
  ENABLE_DARK_MODE: boolean;
}
