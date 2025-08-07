import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays } from 'date-fns';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const Tasks = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showWeeklyView, setShowWeeklyView] = useState(false);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    contactId: null,
    prospectId: null,
    prospectBusinessId: null
  });

  // Load tasks from Firestore on component mount
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const tasksRef = collection(db, 'tasks');
      const snapshot = await getDocs(tasksRef);
      
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by due date
      tasksData.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (newTask.title.trim()) {
      try {
        const taskData = {
          ...newTask,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(db, 'tasks'), taskData);
        
        const newTaskWithId = {
          id: docRef.id,
          ...taskData
        };
        
        setTasks([...tasks, newTaskWithId]);
        setNewTask({
          title: '',
          description: '',
          dueDate: new Date().toISOString().split('T')[0],
          priority: 'medium',
          contactId: null,
          prospectId: null,
          prospectBusinessId: null
        });
        setShowAddTask(false);
      } catch (error) {
        console.error('Error adding task:', error);
        alert('Failed to add task: ' + error.message);
      }
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ff4444';
      case 'medium': return '#ffaa00';
      case 'low': return '#44aa44';
      default: return '#666';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#44aa44';
      case 'in_progress': return '#ffaa00';
      case 'pending': return '#666';
      default: return '#666';
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setEditingTask({ ...task });
    setShowTaskDetails(true);
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !editingTask.title.trim()) return;
    
    try {
      const taskRef = doc(db, 'tasks', editingTask.id);
      await updateDoc(taskRef, {
        ...editingTask,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setTasks(tasks.map(task => 
        task.id === editingTask.id ? { ...task, ...editingTask } : task
      ));
      
      setShowTaskDetails(false);
      setSelectedTask(null);
      setEditingTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task: ' + error.message);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
      
      // Update editing task if it's the same one
      if (editingTask && editingTask.id === taskId) {
        setEditingTask({ ...editingTask, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Failed to update task status: ' + error.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      
      // Update local state
      setTasks(tasks.filter(task => task.id !== taskId));
      
      setShowTaskDetails(false);
      setSelectedTask(null);
      setEditingTask(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task: ' + error.message);
    }
  };

  const getTasksForDate = (date) => {
    const dateString = date.toISOString().split('T')[0];
    return tasks.filter(task => task.dueDate === dateString);
  };

  const getWeeklyData = () => {
    const currentDate = new Date(); // Use actual current date
    const start = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday as first day
    const end = endOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday as first day
    const weekDays = eachDayOfInterval({ start, end });
    
    return weekDays.map(day => ({
      date: day,
      tasks: getTasksForDate(day)
    }));
  };

  const getTodaysTasks = () => {
    const today = new Date(); // Use actual current date
    return getTasksForDate(today);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button
          onClick={() => navigate('/')}
          style={styles.homeButton}
        >
          Home
        </button>
        <h1 style={styles.title}>Tasks</h1>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <button
          onClick={() => setShowWeeklyView(true)}
          style={styles.weeklyButton}
        >
          Weekly View
        </button>
        <button
          onClick={() => setShowAddTask(true)}
          style={styles.addButton}
        >
          Add Task
        </button>
      </div>

      {/* Today's Tasks */}
      <div style={styles.todaysContainer}>
        <h2 style={styles.todaysTitle}>Today's Tasks - {format(new Date(), 'EEEE, MMMM do')}</h2>
        {loading ? (
          <p style={styles.loadingText}>Loading tasks...</p>
        ) : getTodaysTasks().length === 0 ? (
          <p style={styles.noTasksToday}>No tasks scheduled for today</p>
        ) : (
          <div style={styles.taskList}>
            {getTodaysTasks().map(task => (
              <div 
                key={task.id} 
                style={{
                  ...styles.taskCard,
                  cursor: 'pointer',
                  borderLeft: `4px solid ${getStatusColor(task.status)}`
                }}
                onClick={() => handleTaskClick(task)}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                <div style={styles.taskHeader}>
                  <h3 style={styles.taskTitle}>{task.title}</h3>
                  <div style={styles.taskBadges}>
                    <span style={{
                      ...styles.priorityBadge,
                      backgroundColor: getPriorityColor(task.priority)
                    }}>
                      {task.priority}
                    </span>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusColor(task.status)
                    }}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <p style={styles.taskDescription}>{task.description}</p>
                <div style={styles.taskMeta}>
                  <span style={styles.taskDate}>Due: {task.dueDate}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>



      {/* Add Task Modal */}
      {showAddTask && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Add New Task</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>Title</label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                style={styles.input}
                placeholder="Task title"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                style={styles.textarea}
                placeholder="Task description"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Due Date</label>
              <input
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Priority</label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                style={styles.select}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div style={styles.modalActions}>
              <button
                onClick={() => setShowAddTask(false)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                style={styles.saveButton}
              >
                Save Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weekly View Modal */}
      {showWeeklyView && (
        <div style={styles.modalOverlay}>
          <div style={styles.weeklyModal}>
            <h3 style={styles.modalTitle}>Weekly View - {format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'MMM d')} - {format(endOfWeek(new Date(), { weekStartsOn: 0 }), 'MMM d, yyyy')}</h3>
            <div style={styles.weeklyGrid}>
              {getWeeklyData().map(({ date, tasks }) => (
                <div key={date.toISOString()} style={styles.weeklyDay}>
                  <h4 style={styles.weeklyDayTitle}>
                    {format(date, 'EEE')}
                    <br />
                    {format(date, 'MMM d')}
                  </h4>
                  <div style={styles.weeklyDayTasks}>
                    {tasks.length === 0 ? (
                      <p style={styles.noTasksDay}>No tasks</p>
                    ) : (
                      tasks.map(task => (
                        <div 
                          key={task.id} 
                          style={{
                            ...styles.weeklyTask,
                            borderLeftColor: getPriorityColor(task.priority),
                            cursor: 'pointer'
                          }}
                          onClick={() => handleTaskClick(task)}
                          onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
                          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                          <div style={styles.weeklyTaskTitle}>{task.title}</div>
                          <div style={styles.weeklyTaskPriority}>
                            {task.priority}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div style={styles.modalActions}>
              <button
                onClick={() => setShowWeeklyView(false)}
                style={styles.closeButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {showTaskDetails && selectedTask && editingTask && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Task Details</h3>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Title</label>
              <input
                type="text"
                value={editingTask.title}
                onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <textarea
                value={editingTask.description}
                onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                style={styles.textarea}
                rows={4}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Due Date</label>
              <input
                type="date"
                value={editingTask.dueDate}
                onChange={(e) => setEditingTask({...editingTask, dueDate: e.target.value})}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Priority</label>
              <select
                value={editingTask.priority}
                onChange={(e) => setEditingTask({...editingTask, priority: e.target.value})}
                style={styles.select}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Status</label>
              <select
                value={editingTask.status}
                onChange={(e) => setEditingTask({...editingTask, status: e.target.value})}
                style={styles.select}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div style={styles.modalActions}>
              <button
                onClick={() => handleDeleteTask(editingTask.id)}
                style={styles.deleteButton}
              >
                Delete Task
              </button>
              <button
                onClick={() => {
                  setShowTaskDetails(false);
                  setSelectedTask(null);
                  setEditingTask(null);
                }}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTask}
                style={styles.saveButton}
              >
                Update Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f6f1',
    fontFamily: 'Georgia, serif',
    padding: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '30px',
    position: 'relative',
  },
  homeButton: {
    position: 'fixed',
    top: '32px',
    left: '32px',
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 24px',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transition: 'background 0.2s',
    zIndex: 1000,
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '300',
    color: '#2c2c2c',
    margin: 0,
    textAlign: 'center',
    letterSpacing: '1px',
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    marginBottom: '30px',
  },
  weeklyButton: {
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 24px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  addButton: {
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 24px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  todaysContainer: {
    maxWidth: '800px',
    margin: '0 auto 30px auto',
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    padding: '30px',
  },
  todaysTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#2c2c2c',
    marginBottom: '20px',
    textAlign: 'center',
  },
  noTasksToday: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: '20px',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    padding: '20px',
  },

  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  taskCard: {
    border: '1px solid #eee',
    borderRadius: '12px',
    padding: '20px',
    backgroundColor: '#fafafa',
    transition: 'box-shadow 0.2s',
  },
  taskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
  },
  taskTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#2c2c2c',
    margin: 0,
  },
  priorityBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  taskDescription: {
    color: '#666',
    marginBottom: '10px',
    lineHeight: '1.5',
  },
  taskDate: {
    color: '#999',
    fontSize: '14px',
    margin: 0,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '30px',
    width: '90%',
    maxWidth: '500px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#2c2c2c',
    marginBottom: '20px',
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#2c2c2c',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'Georgia, serif',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'Georgia, serif',
    minHeight: '80px',
    resize: 'vertical',
  },
  select: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'Georgia, serif',
  },
  modalActions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'flex-end',
    marginTop: '30px',
  },
  cancelButton: {
    background: '#f5f5f5',
    color: '#333',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  saveButton: {
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  weeklyModal: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '30px',
    width: '95%',
    maxWidth: '1200px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  weeklyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '15px',
    marginBottom: '20px',
  },
  weeklyDay: {
    border: '1px solid #eee',
    borderRadius: '12px',
    padding: '15px',
    backgroundColor: '#fafafa',
    minHeight: '200px',
  },
  weeklyDayTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#2c2c2c',
    marginBottom: '15px',
    textAlign: 'center',
    lineHeight: '1.2',
  },
  weeklyDayTasks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  noTasksDay: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    fontSize: '12px',
    margin: 0,
  },
  weeklyTask: {
    padding: '8px 12px',
    backgroundColor: '#fff',
    borderRadius: '6px',
    borderLeft: '4px solid',
    fontSize: '12px',
  },
  weeklyTaskTitle: {
    fontWeight: '600',
    color: '#2c2c2c',
    marginBottom: '4px',
    fontSize: '11px',
  },
  weeklyTaskPriority: {
    fontSize: '10px',
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  closeButton: {
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  taskBadges: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  taskMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '10px',
    paddingTop: '10px',
    borderTop: '1px solid #eee',
  },
  deleteButton: {
    backgroundColor: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
};

export default Tasks; 