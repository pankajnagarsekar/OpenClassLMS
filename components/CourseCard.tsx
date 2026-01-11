
import React from 'react';
import { Course } from '../types';

interface CourseCardProps {
  course: Course;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group flex flex-col">
      <div className="aspect-video relative overflow-hidden bg-slate-100">
        <img 
          src={course.thumbnail_url || `https://picsum.photos/seed/${course.id}/400/225`} 
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] font-black uppercase text-slate-800 border border-slate-200 shadow-sm">
            {course.access_days} Days Access
          </span>
        </div>
      </div>
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-lg font-black text-slate-900 mb-2 line-clamp-1">{course.title}</h3>
        <p className="text-slate-500 text-sm mb-6 line-clamp-2 h-10 leading-relaxed">
          {course.description || "Master these skills with professional-grade curriculum and hands-on projects."}
        </p>
        <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-[10px] font-black border border-indigo-100">
              {course.Teacher?.name.charAt(0) || 'T'}
            </div>
            <span className="text-xs font-bold text-slate-500">{course.Teacher?.name || 'Instructor'}</span>
          </div>
          <button 
            onClick={() => window.location.hash = `#/course/${course.id}`}
            className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors active:scale-95"
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  );
};
