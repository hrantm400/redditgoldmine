import { Link } from "react-router-dom";
import clsx from "clsx";

const CourseCard = ({ course, highlight = false }) => (
  <article className={clsx("card-neo g-fade-in", highlight && "bg-neo-accent")}>
    <div className="flex flex-col gap-6 md:flex-row md:items-center">
      <div className="flex-1 space-y-4">
        <p className="text-xs font-heavy uppercase tracking-[0.3em] text-gray-500">
          {course.difficulty || "All levels"}
        </p>
        <h3 className="text-4xl font-display font-extrabold text-neo-black">{course.title}</h3>
        <p className="text-lg text-gray-700">{course.subtitle}</p>
        <div className="flex flex-wrap gap-4 font-bold text-sm uppercase">
          {course.tags?.map((tag) => (
            <span key={tag} className="bg-white border-2 border-neo-black px-3 py-1">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="md:w-64 space-y-4">
        <div className="text-right font-heavy">
          <div className="text-5xl text-neo-main">${course.price}</div>
          <div className="text-2xl text-gray-500 line-through decoration-4">${course.compareAt}</div>
        </div>
        <div>
          <div className="flex justify-between text-sm font-bold mb-2">
            <span>Progress</span>
            <span>{Math.round((course.progress || 0) * 100)}%</span>
          </div>
          <div className="h-6 border-4 border-neo-black bg-white relative overflow-hidden shadow-neo-sm">
            <div
              className="h-full bg-neo-main transition-all duration-500 ease-out"
              style={{ width: `${Math.round((course.progress || 0) * 100)}%` }}
            />
          </div>
        </div>
        <Link to={`/watch-course/${course.id}`} className="btn-neo-main w-full text-center" data-cursor="link">
          Open player
        </Link>
      </div>
    </div>
  </article>
);

export default CourseCard;


