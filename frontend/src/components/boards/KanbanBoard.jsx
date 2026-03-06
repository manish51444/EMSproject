import { useState, useCallback } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import BoardColumn from './BoardColumn';
import { updateIssueStatus } from '../../services/api';
import toast from 'react-hot-toast';

const KanbanBoard = ({ issues, onUpdate, onCreateIssue, onDelete }) => {
  const [draggedIssueId, setDraggedIssueId] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const columns = [
    { id: 'todo', title: 'TO DO', color: 'bg-gray-100' },
    { id: 'in_progress', title: 'IN PROGRESS', color: 'bg-blue-50' },
    { id: 'in_review', title: 'IN REVIEW', color: 'bg-purple-50' },
    { id: 'done', title: 'DONE', color: 'bg-green-50' },
  ];

  const groupedIssues = {
    todo: issues.filter((i) => i.status === 'todo'),
    in_progress: issues.filter((i) => i.status === 'in_progress'),
    in_review: issues.filter((i) => i.status === 'in_review'),
    done: issues.filter((i) => i.status === 'done'),
  };

  const handleDragStart = (start) => {
    setDraggedIssueId(start.draggableId);
    document.body.classList.add('dragging');
  };

  const handleDragEnd = useCallback(async (result) => {
    const { destination, source, draggableId } = result;

    // Reset cursor
    document.body.classList.remove('dragging');
    setDraggedIssueId(null);

    // If dropped outside a droppable area, do nothing
    if (!destination) {
      return;
    }

    // If dropped in the same position, do nothing
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Prevent multiple simultaneous updates
    if (isUpdating) {
      return;
    }

    setIsUpdating(true);

    try {
      await updateIssueStatus(draggableId, destination.droppableId);
      toast.success('Issue moved successfully');
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update issue status';
      toast.error(errorMessage);
      console.error('Drag error:', error);

      // Optionally trigger a refresh to restore the original state
      if (onUpdate) {
        onUpdate();
      }
    } finally {
      setIsUpdating(false);
    }
  }, [isUpdating, onUpdate]);

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex space-x-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <BoardColumn
            key={column.id}
            columnId={column.id}
            title={column.title}
            issues={groupedIssues[column.id] || []}
            color={column.color}
            onCreateIssue={onCreateIssue}
            onDelete={onDelete}
          />
        ))}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;
