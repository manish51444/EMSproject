import { Droppable, Draggable } from '@hello-pangea/dnd';
import IssueCard from '../issues/IssueCard';
import { Plus } from 'lucide-react';

const BoardColumn = ({ columnId, title, issues, color, onCreateIssue, onDelete }) => {
  return (
    <div className="flex-1 min-w-[280px] bg-gray-100 rounded-xl shadow-sm">
      <div className="bg-white px-4 py-3 rounded-t-xl border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-[#0e2b3d] text-sm uppercase tracking-wide">
          {title} <span className="text-[#666] font-normal">{issues.length}</span>
        </h3>
      </div>
      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[400px] p-3 space-y-2 rounded-b-xl transition-colors ${snapshot.isDraggingOver ? 'bg-[#e6faf5] ring-2 ring-[#1cca9b]/30' : 'bg-gray-50'
              }`}
          >
            {issues.map((issue, index) => (
              <Draggable
                key={issue._id}
                draggableId={String(issue._id)}
                index={index}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                      ...provided.draggableProps.style,
                    }}
                    className={snapshot.isDragging ? 'opacity-90' : ''}
                  >
                    <IssueCard
                      issue={issue}
                      isDragging={snapshot.isDragging}
                      provided={provided}
                      snapshot={snapshot}
                      onDelete={onDelete}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            <button
              onClick={() => onCreateIssue?.(columnId)}
              className="w-full mt-2 py-2 text-sm text-[#666] hover:text-[#0e2b3d] hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center space-x-1"
            >
              <Plus size={16} />
              <span>Create</span>
            </button>
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default BoardColumn;
