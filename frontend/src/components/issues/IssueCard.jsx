import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Bug, FileText, BookOpen, Zap, Check, ChevronUp, ChevronDown, GripVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';

const typeIcons = {
  bug: Bug,
  task: FileText,
  story: BookOpen,
  epic: Zap,
};

const IssueCard = ({ issue, isDragging = false, provided, snapshot, onDelete }) => {
  const TypeIcon = typeIcons[issue.type] || FileText;
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete && window.confirm(`Delete "${issue.title}"? This cannot be undone.`)) {
      onDelete(issue);
    }
  };

  const handleClick = (e) => {
    // Prevent navigation when dragging
    if (isDragging || snapshot?.isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    navigate(`/issues/${issue._id}`);
  };

  const cardContent = (
    <div
      className={`block bg-white border border-gray-200 rounded-xl p-3 hover:shadow-md transition-all group ${
        isDragging || snapshot?.isDragging
          ? 'cursor-grabbing opacity-90'
          : 'cursor-grab'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2 flex-1">
          <div className={`transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <Check className="w-4 h-4 text-[#1cca9b]" />
          </div>
          <TypeIcon size={14} className="text-[#666] flex-shrink-0" />
          <span className="text-xs font-medium text-[#666]">{issue.key}</span>
        </div>
        <div className={`flex items-center space-x-1 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          {onDelete && (
            <button
              type="button"
              onClick={handleDeleteClick}
              className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
              title="Delete issue"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronUp className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronDown className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
          <div className="p-1">
            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
          </div>
        </div>
      </div>
      <h3 className="text-sm font-medium text-[#0e2b3d] mb-3 line-clamp-2">
        {issue.title}
      </h3>
      <div className="flex items-center justify-between">
        {issue.dueDate && (
          <div className="flex items-center space-x-1 text-xs text-[#666]">
            <span>{format(new Date(issue.dueDate), 'd MMM').toUpperCase()}</span>
          </div>
        )}
        <div className="flex items-center space-x-1">
          {(() => {
            const assigneesList = (issue.assignees && issue.assignees.length > 0)
              ? issue.assignees
              : (issue.assignee ? [issue.assignee] : []);
            return assigneesList.length > 0 && (
              <div className="flex items-center -space-x-1">
                {assigneesList.slice(0, 3).map((assignee, index) => (
                  <div key={assignee?._id || assignee || index}>
                    {assignee?.avatar ? (
                      <img
                        src={assignee.avatar}
                        alt={assignee.name}
                        className="w-6 h-6 rounded-full border-2 border-white"
                        title={assignee.name}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#1cca9b] flex items-center justify-center text-white text-xs border-2 border-white" title={assignee?.name}>
                        {assignee?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                ))}
                {assigneesList.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs border-2 border-white" title={`+${assigneesList.length - 3} more`}>
                    +{assigneesList.length - 3}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );

  return cardContent;
};

export default IssueCard;
