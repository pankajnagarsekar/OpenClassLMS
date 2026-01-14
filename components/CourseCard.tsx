
import React from 'react';
import { Course } from '../types';

interface CourseCardProps {
  course: Course;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col group h-full">
      {/* Thumbnail Section */}
      <div className="h-48 relative overflow-hidden bg-slate-100">
        <img 
          src={course.thumbnail_url || `https://picsum.photos/seed/${course.id}/400/225`} 
          alt={course.title}
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3">
          <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-700 shadow-sm border border-white/50">
            {course.access_days} Days Access
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight group-hover:text-indigo-600 transition-colors">
          {course.title}
        </h3>
        
        <p className="text-slate-500 text-sm mb-6 line-clamp-2 leading-relaxed">
          {course.description || "Master new skills with our expert-led curriculum and hands-on projects."}
        </p>
        
        <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-xs font-bold border border-indigo-100">
              {course.Teacher?.name.charAt(0) || 'I'}
            </div>
            <span className="text-xs font-semibold text-slate-500 truncate max-w-[100px]">
              {course.Teacher?.name || 'Instructor'}
            </span>
          </div>
          
          <button 
            onClick={() => window.location.hash = `#/course/${course.id}`}
            className="flex items-center space-x-1 text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <span>Start Learning</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
};
