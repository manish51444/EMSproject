import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import {
  getDailyTasks,
  createDailyTask,
  updateDailyTask,
  deleteDailyTask,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  ClipboardList,
  Calendar,
  Save,
  Trash2,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const formatDateForInput = (d) => {
  const date = new Date(d);
  return date.toISOString().slice(0, 10);
};

const formatDisplayDate = (d) => {
  return new Date(d).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const DailyTasksView = ({ projectId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => formatDateForInput(new Date()));
  const [myTitle, setMyTitle] = useState('');
  const [myContent, setMyContent] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['dailyTasks', projectId, selectedDate],
    queryFn: () =>
      getDailyTasks(projectId, { date: selectedDate }).then((res) => res.data),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => createDailyTask(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyTasks', projectId] });
      toast.success('Daily task saved');
      setEditingTaskId(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to save daily task');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ taskId, data }) => updateDailyTask(projectId, taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyTasks', projectId] });
      toast.success('Daily task updated');
      setEditingTaskId(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update daily task');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId) => deleteDailyTask(projectId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyTasks', projectId] });
      toast.success('Daily task removed');
      setMyTitle('');
      setMyContent('');
      setEditingTaskId(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete daily task');
    },
  });

  const myTask = tasks.find((t) => t.userId?._id === user?.id || t.userId === user?.id);

  useEffect(() => {
    if (myTask) {
      setMyTitle(myTask.title || '');
      setMyContent(myTask.content || '');
      setEditingTaskId(myTask._id);
    } else {
      setMyTitle('');
      setMyContent('');
      setEditingTaskId(null);
    }
  }, [selectedDate, myTask ? myTask._id : null]);

  const handleSave = () => {
    if (editingTaskId) {
      updateMutation.mutate({
        taskId: editingTaskId,
        data: { title: myTitle, content: myContent },
      });
    } else {
      createMutation.mutate({
        date: selectedDate,
        title: myTitle,
        content: myContent,
      });
    }
  };

  const handleDelete = () => {
    if (!myTask) return;
    if (window.confirm('Remove your daily task for this date?')) {
      deleteMutation.mutate(myTask._id);
    }
  };

  const goPrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(formatDateForInput(d));
    setMyTitle('');
    setMyContent('');
    setEditingTaskId(null);
  };

  const goNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(formatDateForInput(d));
    setMyTitle('');
    setMyContent('');
    setEditingTaskId(null);
  };

  const isToday = selectedDate === formatDateForInput(new Date());

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Daily Tasks (MOM)</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrevDay}
              className="p-2 rounded-lg hover:bg-gray-200 text-gray-600"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setMyTitle('');
                  setMyContent('');
                  setEditingTaskId(null);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={goNextDay}
              className="p-2 rounded-lg hover:bg-gray-200 text-gray-600"
              aria-label="Next day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-500 ml-1">
              {formatDisplayDate(selectedDate)}
              {isToday && (
                <span className="ml-2 text-primary-600 font-medium">Today</span>
              )}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* My task form */}
          <div className="border border-primary-200 rounded-lg bg-primary-50/30 p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              My task for this day
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Task title (e.g. What I did / plan to do)"
                value={myTitle}
                onChange={(e) => setMyTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <textarea
                placeholder="Details (MOM notes, blockers, updates…)"
                value={myContent}
                onChange={(e) => setMyContent(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
                >
                  <Save className="w-4 h-4" />
                  {editingTaskId ? 'Update' : 'Save'} task
                </button>
                {myTask && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 flex items-center gap-2 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Team tasks for this date */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Team updates for this day</h3>
            {isLoading ? (
              <p className="text-gray-500 text-sm">Loading…</p>
            ) : tasks.length === 0 ? (
              <p className="text-gray-500 text-sm">No daily tasks for this date yet.</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => {
                  const name =
                    task.userId?.name ||
                    (task.userId?.email && task.userId.email.split('@')[0]) ||
                    'Unknown';
                  const isMe = task.userId?._id === user?.id || task.userId === user?.id;
                  return (
                    <div
                      key={task._id}
                      className={`rounded-lg border p-4 ${
                        isMe
                          ? 'border-primary-200 bg-primary-50/30'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">
                          {name}
                          {isMe && (
                            <span className="ml-2 text-xs text-primary-600">(You)</span>
                          )}
                        </span>
                      </div>
                      {task.title && (
                        <p className="text-sm font-medium text-gray-800 mb-1">{task.title}</p>
                      )}
                      {task.content && (
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.content}</p>
                      )}
                      {!task.title && !task.content && (
                        <p className="text-sm text-gray-400 italic">No details added.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyTasksView;
