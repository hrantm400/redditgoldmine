import { TrendingUp, Clock, MessageSquare } from "lucide-react";

const ForumFilters = ({ sortBy, onSortChange, selectedCategory }) => {
  const sortOptions = [
    { value: "newest", label: "Newest", icon: Clock },
    { value: "popular", label: "Popular", icon: TrendingUp },
    { value: "comments", label: "Most Comments", icon: MessageSquare },
  ];

  return (
    <div className="flex items-center gap-4 mb-6 flex-wrap">
      <span className="text-sm font-bold text-neo-black">Sort by:</span>
      {sortOptions.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            onClick={() => onSortChange(option.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded border-2 border-neo-black transition-all ${
              sortBy === option.value
                ? "bg-neo-main text-white"
                : "bg-white hover:bg-neo-main/10"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ForumFilters;


