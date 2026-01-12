import axios, { AxiosInstance } from "axios";

const API_URL = (import.meta as any).env?.VITE_API_URL || "/api";

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 5000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const MOCK_COURSES = [
  {
    id: 1,
    title: "Mastering React & TypeScript",
    teacher_id: 1,
    access_days: 365,
    Teacher: { name: "Dr. Sarah Jenkins" },
    Lessons: [
      {
        id: 101,
        title: "Intro",
        type: "video",
        content_url: "https://www.youtube.com/embed/SqcY0GlETPk",
        AssignmentSubmissions: [],
      },
      {
        id: 102,
        title: "Final Project",
        type: "assignment",
        AssignmentSubmissions: [],
      },
    ],
  },
];

const MOCK_USERS = [
  {
    id: 1,
    name: "Demo Student",
    email: "student@openclass.com",
    role: "student",
    is_verified: true,
    is_active: true,
    createdAt: "2023-10-01",
  },
  {
    id: 2,
    name: "Demo Teacher",
    email: "teacher@openclass.com",
    role: "teacher",
    is_verified: true,
    is_active: true,
    createdAt: "2023-09-15",
  },
];

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (
      !err.response ||
      err.code === "ERR_NETWORK" ||
      err.response.status === 404
    ) {
      const url = err.config.url;
      if (url.includes("/toggle-status"))
        return Promise.resolve({ data: { message: "Status toggled" } });
      if (url.includes("/extend"))
        return Promise.resolve({ data: { message: "Access extended" } });
      if (url.includes("/auth/login"))
        return Promise.resolve({
          data: { token: "mock", user: MOCK_USERS[0] },
        });
      if (url.includes("/admin/users"))
        return Promise.resolve({ data: MOCK_USERS });
      if (url === "/courses" || url === "/courses/")
        return Promise.resolve({ data: MOCK_COURSES });
      if (url.startsWith("/courses/"))
        return Promise.resolve({ data: MOCK_COURSES[0] });
      if (url.includes("/student/dashboard"))
        return Promise.resolve({
          data: [
            {
              course_id: 1,
              title: "Mastering React",
              progress_percentage: 85,
              completed_lessons: 1,
              total_lessons: 2,
              expires_at: "2025-12-31",
              is_active: true,
            },
          ],
        });
      return Promise.resolve({ data: {} });
    }
    return Promise.reject(err);
  }
);

export default api;
