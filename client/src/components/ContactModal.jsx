import React, { useState, useEffect } from 'react';
import { firebase } from '../firebase';
import { getContactActivities } from '../services/activitiesService';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

const SECTOR_OPTIONS = [
  '',
  'Retail',
  'Industrial',
  'Investor',
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Real Estate',
  'Manufacturing',
  'Consulting',
  'Other',
];

const ContactModal = ({ open, onClose, contact, mode = 'view', onSave }) => {
  const [editContact, setEditContact] = useState(contact || {});
  const [contactActivities, setContactActivities] = useState([]);
  const [contactActivitiesLoading, setContactActivitiesLoading] = useState(false);
  const [contactTasks, setContactTasks] = useState([]);
  const [contactTasksLoading, setContactTasksLoading] = useState(false);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);

  useEffect(() => {
    setEditContact(contact || {});
  }, [contact]);

  // Fetch activities for the contact
  const fetchContactActivities = async () => {
    if (!open || !contact || mode !== 'view') {
      setContactActivities([]);
      return;
    }
    
    setContactActivitiesLoading(true);
    try {
      console.log('Fetching activities for contact:', contact.id);
      
      // Use API endpoint to fetch activities
      const response = await getContactActivities(contact.id);
      
      if (response.success) {
        console.log('Contact activities found:', response.activities.length);
        setContactActivities(response.activities);
      } else {
        console.error('Failed to fetch activities:', response.error);
        setContactActivities([]);
      }
    } catch (err) {
      console.error('Error fetching contact activities:', err);
      setContactActivities([]);
    } finally {
      setContactActivitiesLoading(false);
    }
  };

  // Fetch tasks for the contact
  const fetchContactTasks = async () => {
    if (!open || !contact || mode !== 'view') {
      setContactTasks([]);
      return;
    }
    
    setContactTasksLoading(true);
    try {
      console.log('Fetching tasks for contact:', contact.id);
      
      // Query tasks collection for tasks linked to this contact
      const tasksRef = collection(db, 'tasks');
      const tasksQuery = query(tasksRef, where('contactId', '==', contact.id));
      const tasksSnapshot = await getDocs(tasksQuery);
      
      const tasks = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('Contact tasks found:', tasks.length);
      setContactTasks(tasks);
    } catch (err) {
      console.error('Error fetching contact tasks:', err);
      setContactTasks([]);
    } finally {
      setContactTasksLoading(false);
    }
  };

  useEffect(() => {
    fetchContactActivities();
    fetchContactTasks();
  }, [open, contact, mode]);

  // Listen for AI activity creation events and refresh activities
  useEffect(() => {
    const handleAiActivityCreated = (event) => {
      console.log('🎯 ContactModal received aiActivityCreated event:', event.detail);
      const { contactId } = event.detail;
      console.log('🎯 Current contact ID:', contact?.id, 'Event contact ID:', contactId);
      if (open && contact && contact.id === contactId) {
        console.log('🔄 AI Activity created for this contact, refreshing activities');
        fetchContactActivities();
      } else {
        console.log('❌ ContactModal not open or contact ID mismatch');
      }
    };

    window.addEventListener('aiActivityCreated', handleAiActivityCreated);
    
    return () => {
      window.removeEventListener('aiActivityCreated', handleAiActivityCreated);
    };
  }, [open, contact]);

  if (!open) return null;

  const handleChange = (field, value) => {
    setEditContact(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (onSave) onSave(editContact);
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setEditingTask({ ...task });
    setShowTaskDetails(true);
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;
    
    try {
      const taskRef = doc(db, 'tasks', editingTask.id);
      await updateDoc(taskRef, {
        title: editingTask.title,
        description: editingTask.description,
        dueDate: editingTask.dueDate,
        priority: editingTask.priority,
        status: editingTask.status
      });
      
      // Refresh tasks
      fetchContactTasks();
      setShowTaskDetails(false);
      setSelectedTask(null);
      setEditingTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!editingTask) return;
    
    try {
      const taskRef = doc(db, 'tasks', editingTask.id);
      await updateDoc(taskRef, { status: newStatus });
      
      setEditingTask(prev => ({ ...prev, status: newStatus }));
      fetchContactTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      fetchContactTasks();
      setShowTaskDetails(false);
      setSelectedTask(null);
      setEditingTask(null);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Create styles based on current mode
  const getStyles = (currentMode) => ({
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.25)',
      zIndex: 5000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'auto',
    },
    modal: {
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      padding: currentMode === 'edit' ? '20px 30px 16px 30px' : '36px 48px 32px 48px',
      minWidth: '500px',
      maxWidth: currentMode === 'edit' ? '900px' : '700px',
      width: currentMode === 'edit' ? '95vw' : '90vw',
      minHeight: '200px',
      maxHeight: currentMode === 'edit' ? '75vh' : '95vh',
      position: 'relative',
      fontFamily: 'Georgia, serif',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    closeButton: {
      position: 'absolute',
      top: 18,
      right: 22,
      fontSize: 28,
      background: 'none',
      border: 'none',
      color: '#222',
      cursor: 'pointer',
      zIndex: 2,
    },
    title: {
      fontSize: currentMode === 'edit' ? '1.5rem' : '2rem',
      fontWeight: 600,
      marginBottom: currentMode === 'edit' ? 12 : 18,
      color: '#222',
      textAlign: 'center',
    },
    content: {
      display: 'flex',
      flexDirection: 'column',
      gap: currentMode === 'edit' ? 12 : 18,
      marginBottom: currentMode === 'edit' ? 12 : 18,
      flex: 1,
    },
    actions: {
      display: 'flex',
      justifyContent: 'center',
      gap: 18,
      marginTop: 10,
    },
    saveButton: {
      background: '#222',
      color: '#fff',
      border: 'none',
      borderRadius: 8,
      padding: '10px 28px',
      fontSize: '1rem',
      fontFamily: 'Georgia, serif',
      cursor: 'pointer',
      fontWeight: 500,
      transition: 'background 0.2s',
    },
    cancelButton: {
      background: 'rgba(0,0,0,0.08)',
      color: '#222',
      border: 'none',
      borderRadius: 8,
      padding: '10px 28px',
      fontSize: '1rem',
      fontFamily: 'Georgia, serif',
      cursor: 'pointer',
      fontWeight: 500,
      transition: 'background 0.2s',
    },
    activitiesSection: {
      marginTop: 20,
      maxHeight: '300px',
      overflowY: 'auto',
      borderTop: '2px solid #e0e0e0',
      paddingTop: 15,
    },
    activitiesTitle: {
      fontSize: '1.3rem',
      fontWeight: 600,
      marginBottom: 12,
      color: '#222',
      borderBottom: '1px solid #ddd',
      paddingBottom: 8,
      display: 'flex', // Added for button alignment
      alignItems: 'center', // Added for button alignment
      gap: '12px', // Added for spacing
    },
    addActivityButton: { // New style for the "Add Activity" button
      background: '#222',
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      padding: '4px 12px',
      fontSize: '0.8rem',
      fontWeight: 500,
      cursor: 'pointer',
      fontFamily: 'Georgia, serif',
      transition: 'background 0.2s',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    activitiesLoading: {
      color: '#222',
      fontSize: '1rem',
      fontFamily: 'Georgia, serif',
      textAlign: 'center',
    },
    activitiesEmpty: {
      color: '#222',
      fontSize: '1rem',
      fontFamily: 'Georgia, serif',
      textAlign: 'center',
    },
    activitiesList: {
      listStyleType: 'none',
      padding: 0,
    },
    activityItem: {
      marginBottom: 12,
      padding: '8px 12px',
      border: '1px solid #e0e0e0',
      borderRadius: 6,
      background: 'rgba(255,255,255,0.8)',
    },
    activityHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    activityType: {
      fontWeight: 600,
      color: '#2c5aa0',
      fontSize: '0.9rem',
      textTransform: 'capitalize',
    },
    activityDescription: {
      color: '#444',
      fontSize: '0.85rem',
      fontFamily: 'Georgia, serif',
      wordBreak: 'break-word',
      marginBottom: 2,
    },
    activityDuration: {
      color: '#666',
      fontSize: '0.75rem',
      fontFamily: 'Georgia, serif',
      fontStyle: 'italic',
    },
    activityTimestamp: {
      color: '#666',
      fontSize: '0.75rem',
      fontFamily: 'Georgia, serif',
    },
    tasksSection: {
      marginTop: 20,
      maxHeight: '300px',
      overflowY: 'auto',
      borderTop: '2px solid #e0e0e0',
      paddingTop: 15,
    },
    tasksTitle: {
      fontSize: '1.3rem',
      fontWeight: 600,
      marginBottom: 12,
      color: '#222',
      borderBottom: '1px solid #ddd',
      paddingBottom: 8,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    addTaskButton: {
      background: '#222',
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      padding: '4px 12px',
      fontSize: '0.8rem',
      fontWeight: 500,
      cursor: 'pointer',
      fontFamily: 'Georgia, serif',
      transition: 'background 0.2s',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    tasksLoading: {
      color: '#222',
      fontSize: '1rem',
      fontFamily: 'Georgia, serif',
      textAlign: 'center',
    },
    tasksEmpty: {
      color: '#222',
      fontSize: '1rem',
      fontFamily: 'Georgia, serif',
      textAlign: 'center',
    },
    tasksList: {
      listStyleType: 'none',
      padding: 0,
    },
    taskItem: {
      marginBottom: 12,
      padding: '8px 12px',
      border: '1px solid #e0e0e0',
      borderRadius: 6,
      background: 'rgba(255,255,255,0.8)',
    },
    taskHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    taskTitle: {
      fontWeight: 600,
      color: '#2c5aa0',
      fontSize: '0.9rem',
    },
    taskStatus: {
      fontSize: '0.75rem',
      fontWeight: 600,
      padding: '2px 6px',
      borderRadius: '4px',
      textTransform: 'uppercase',
    },
    taskDescription: {
      color: '#444',
      fontSize: '0.85rem',
      fontFamily: 'Georgia, serif',
      wordBreak: 'break-word',
      marginBottom: 2,
    },
    taskDueDate: {
      color: '#666',
      fontSize: '0.75rem',
      fontFamily: 'Georgia, serif',
    },
    taskDetailsOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 6000,
    },
    taskDetailsModal: {
      backgroundColor: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(16px)',
      borderRadius: '18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      padding: '30px',
      minWidth: '500px',
      maxWidth: '600px',
      width: '90vw',
      maxHeight: '80vh',
      overflowY: 'auto',
      fontFamily: 'Georgia, serif',
    },
    taskDetailsTitle: {
      fontSize: '1.5rem',
      fontWeight: 600,
      marginBottom: 20,
      color: '#222',
      textAlign: 'center',
    },
    taskDetailsField: {
      marginBottom: 15,
    },
    taskDetailsLabel: {
      fontWeight: 500,
      color: '#444',
      fontSize: '1rem',
      marginBottom: 5,
    },
    taskDetailsInput: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: 6,
      fontSize: '1rem',
      fontFamily: 'Georgia, serif',
      background: 'rgba(255,255,255,0.8)',
    },
    taskDetailsTextarea: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: 6,
      fontSize: '1rem',
      fontFamily: 'Georgia, serif',
      background: 'rgba(255,255,255,0.8)',
      resize: 'vertical',
      minHeight: '80px',
    },
    taskDetailsSelect: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: 6,
      fontSize: '1rem',
      fontFamily: 'Georgia, serif',
      background: 'rgba(255,255,255,0.8)',
    },
    taskDetailsActions: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 15,
      marginTop: 25,
    },
    taskDetailsButton: {
      padding: '10px 20px',
      fontSize: '1rem',
      fontFamily: 'Georgia, serif',
      cursor: 'pointer',
      fontWeight: 500,
      transition: 'background 0.2s',
      border: 'none',
      borderRadius: 8,
    },
    deleteButton: {
      backgroundColor: '#111',
      color: '#fff',
    },
    cancelButton: {
      backgroundColor: 'rgba(0,0,0,0.08)',
      color: '#222',
    },
    saveButton: {
      backgroundColor: '#222',
      color: '#fff',
    },
    taskDetailsOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 6000,
    },
    taskDetailsModal: {
      backgroundColor: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(16px)',
      borderRadius: '18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      padding: '30px',
      minWidth: '500px',
      maxWidth: '600px',
      width: '90vw',
      maxHeight: '80vh',
      overflowY: 'auto',
      fontFamily: 'Georgia, serif',
    },
    taskDetailsTitle: {
      fontSize: '1.5rem',
      fontWeight: 600,
      marginBottom: 20,
      color: '#222',
      textAlign: 'center',
    },
    taskDetailsField: {
      marginBottom: 15,
    },
    taskDetailsLabel: {
      fontWeight: 500,
      color: '#444',
      fontSize: '1rem',
      marginBottom: 5,
    },
    taskDetailsInput: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: 6,
      fontSize: '1rem',
      fontFamily: 'Georgia, serif',
      background: 'rgba(255,255,255,0.8)',
    },
    taskDetailsTextarea: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: 6,
      fontSize: '1rem',
      fontFamily: 'Georgia, serif',
      background: 'rgba(255,255,255,0.8)',
      resize: 'vertical',
      minHeight: '80px',
    },
    taskDetailsSelect: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: 6,
      fontSize: '1rem',
      fontFamily: 'Georgia, serif',
      background: 'rgba(255,255,255,0.8)',
    },
    taskDetailsActions: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 15,
      marginTop: 25,
    },
    taskDetailsButton: {
      padding: '10px 20px',
      fontSize: '1rem',
      fontFamily: 'Georgia, serif',
      cursor: 'pointer',
      fontWeight: 500,
      transition: 'background 0.2s',
      border: 'none',
      borderRadius: 8,
    },
    deleteButton: {
      backgroundColor: '#111',
      color: '#fff',
    },
    cancelButton: {
      backgroundColor: 'rgba(0,0,0,0.08)',
      color: '#222',
    },
    updateButton: {
      backgroundColor: '#222',
      color: '#fff',
    },
    notesTextarea: {
      height: currentMode === 'edit' ? '60px' : '300px',
      resize: 'vertical',
      minHeight: currentMode === 'edit' ? '50px' : '200px',
      maxHeight: currentMode === 'edit' ? '80px' : '600px',
      width: '100%',
      fontSize: '1.1rem',
      overflowY: 'auto',
    },
    notesDisplay: {
      flex: 1,
      maxHeight: currentMode === 'edit' ? '400px' : '200px',
      overflowY: 'auto',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: 6,
      fontSize: '1rem',
      fontFamily: 'Georgia, serif',
      background: 'rgba(255,255,255,0.7)',
      color: '#222',
      wordBreak: 'break-word',
      lineHeight: '1.4',
    },
  });

  const styles = getStyles(mode);

  if (!open) return null;
  
  return (
    <>
      <div style={styles.overlay}>
        <div
          style={{
            ...styles.modal,
            ...(mode === 'edit' ? {
              maxWidth: '1000px',
              width: '98vw',
              minHeight: '300px',
              padding: '20px 30px 16px 30px',
            } : {})
          }}
        >
          <button style={styles.closeButton} onClick={onClose}>&times;</button>
          <h2 style={styles.title}>
            {mode === 'edit' ? 'Edit Contact' : 'Contact Details'}
          </h2>
          <div style={styles.content}>
            {/* Address */}
            <ModalField
              label="Address"
              value={editContact.address || ''}
              mode={mode}
              onChange={v => handleChange('address', v)}
            />
            {/* Business Sector */}
            {mode === 'edit' ? (
              <div style={fieldStyles.fieldRow}>
                <label style={fieldStyles.label}>Business Sector:</label>
                <select
                  style={fieldStyles.input}
                  value={editContact.businessSector || ''}
                  onChange={e => handleChange('businessSector', e.target.value)}
                >
                  {SECTOR_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt || 'Select sector...'}</option>
                  ))}
                </select>
              </div>
            ) : (
              <ModalField
                label="Business Sector"
                value={editContact.businessSector || ''}
                mode={mode}
                onChange={v => handleChange('businessSector', v)}
              />
            )}

            {/* Company */}
            <ModalField
              label="Company"
              value={editContact.company || ''}
              mode={mode}
              onChange={v => handleChange('company', v)}
            />
            {/* Email */}
            <ModalField
              label="Email"
              value={editContact.email || ''}
              mode={mode}
              onChange={v => handleChange('email', v)}
            />
            {/* First Name */}
            <ModalField
              label="First Name"
              value={editContact.firstName || ''}
              mode={mode}
              onChange={v => handleChange('firstName', v)}
            />
            {/* Last Name */}
            <ModalField
              label="Last Name"
              value={editContact.lastName || ''}
              mode={mode}
              onChange={v => handleChange('lastName', v)}
            />
            {/* LinkedIn */}
            <ModalField
              label="LinkedIn"
              value={editContact.linkedin || ''}
              mode={mode}
              onChange={v => handleChange('linkedin', v)}
            />
            {/* Phone */}
            <ModalField
              label="Phone"
              value={editContact.phone || ''}
              mode={mode}
              onChange={v => handleChange('phone', v)}
            />
            {/* Notes - Enhanced with scrollable area */}
            <div style={fieldStyles.fieldRow}>
              <label style={fieldStyles.label}>Notes:</label>
              {mode === 'edit' ? (
                <textarea
                  style={{
                    ...fieldStyles.input,
                    ...styles.notesTextarea,
                    height: mode === 'edit' ? '60px' : '500px',
                    minHeight: mode === 'edit' ? '50px' : '400px',
                    maxHeight: mode === 'edit' ? '80px' : '1000px',
                    fontSize: '1.2rem',
                    ...(mode === 'edit' ? { width: '100%' } : {})
                  }}
                  value={editContact.notes || ''}
                  onChange={e => handleChange('notes', e.target.value)}
                  placeholder="Enter notes about this contact..."
                />
              ) : (
                <div style={styles.notesDisplay}>
                  {(editContact.notes || '').split('\n').map((line, idx) => (
                    <React.Fragment key={idx}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
            {/* Tasks - only show in view mode */}
            {mode === 'view' && (
              <div style={styles.tasksSection}>
                <div style={styles.tasksTitle}>
                  Tasks
                  <button
                    style={styles.addTaskButton}
                    onClick={() => setShowAddTaskModal(true)}
                  >
                    Add Task
                  </button>
                </div>
                {contactTasksLoading ? (
                  <div style={styles.tasksLoading}>Loading tasks...</div>
                ) : contactTasks.length === 0 ? (
                  <div style={styles.tasksEmpty}>No tasks for this contact.</div>
                ) : (
                  <ul style={styles.tasksList}>
                    {contactTasks.map(task => (
                      <li 
                        key={task.id} 
                        style={{
                          ...styles.taskItem,
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease'
                        }}
                        onClick={() => handleTaskClick(task)}
                        onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                      >
                        <div style={styles.taskHeader}>
                          <span style={styles.taskTitle}>
                            {task.title}
                          </span>
                          <span style={{
                            ...styles.taskStatus,
                            backgroundColor: task.status === 'completed' ? '#44aa44' : 
                                           task.status === 'in_progress' ? '#ffaa00' : '#666',
                            color: '#fff'
                          }}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div style={styles.taskDescription}>
                          {task.description || 'No description'}
                        </div>
                        <div style={styles.taskDueDate}>
                          Due: {task.dueDate}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {/* Activities - only show in view mode */}
            {mode === 'view' && (
              <div style={styles.activitiesSection}>
                <div style={styles.activitiesTitle}>
                  Activities
                  <button
                    style={styles.addActivityButton}
                    onClick={() => setShowAddActivityModal(true)}
                  >
                    Add Activity
                  </button>
                </div>
                {contactActivitiesLoading ? (
                  <div style={styles.activitiesLoading}>Loading activities...</div>
                ) : contactActivities.length === 0 ? (
                  <div style={styles.activitiesEmpty}>No activities for this contact.</div>
                ) : (
                  <ul style={styles.activitiesList}>
                    {contactActivities.map(activity => (
                      <li key={activity.id} style={styles.activityItem}>
                        <div style={styles.activityHeader}>
                          <span style={styles.activityType}>
                            {activity.type ? activity.type.charAt(0).toUpperCase() + activity.type.slice(1) : 'Activity'}
                          </span>
                          <span style={styles.activityTimestamp}>
                            {activity.date?._seconds ? 
                               new Date(activity.date._seconds * 1000).toLocaleDateString() : 
                               activity.timestamp?.toDate?.() ? 
                                 activity.timestamp.toDate().toLocaleDateString() : 
                                 activity.date ? new Date(activity.date).toLocaleDateString() : 
                                 'Unknown date'
                            }
                          </span>
                        </div>
                        <div style={styles.activityDescription}>
                          {activity.description || 'No description'}
                        </div>
                        {activity.duration && (
                          <div style={styles.activityDuration}>
                            Duration: {activity.duration} minutes
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          {mode === 'edit' && (
            <div style={styles.actions}>
              <button style={styles.saveButton} onClick={handleSave}>Save</button>
              <button style={styles.cancelButton} onClick={onClose}>Cancel</button>
            </div>
          )}
        </div>
      </div>
      
      {/* Task Details Modal */}
      {showTaskDetails && selectedTask && editingTask && (
        <div style={styles.taskDetailsOverlay}>
          <div style={styles.taskDetailsModal}>
            <h2 style={styles.taskDetailsTitle}>Task Details</h2>
            
            <div style={styles.taskDetailsField}>
              <label style={styles.taskDetailsLabel}>Title:</label>
              <input
                style={styles.taskDetailsInput}
                value={editingTask.title || ''}
                onChange={(e) => setEditingTask(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            
            <div style={styles.taskDetailsField}>
              <label style={styles.taskDetailsLabel}>Description:</label>
              <textarea
                style={styles.taskDetailsTextarea}
                value={editingTask.description || ''}
                onChange={(e) => setEditingTask(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            <div style={styles.taskDetailsField}>
              <label style={styles.taskDetailsLabel}>Due Date:</label>
              <input
                type="date"
                style={styles.taskDetailsInput}
                value={editingTask.dueDate || ''}
                onChange={(e) => setEditingTask(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
            
            <div style={styles.taskDetailsField}>
              <label style={styles.taskDetailsLabel}>Priority:</label>
              <select
                style={styles.taskDetailsSelect}
                value={editingTask.priority || 'medium'}
                onChange={(e) => setEditingTask(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div style={styles.taskDetailsField}>
              <label style={styles.taskDetailsLabel}>Status:</label>
              <select
                style={styles.taskDetailsSelect}
                value={editingTask.status || 'pending'}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            <div style={styles.taskDetailsActions}>
              <button 
                onClick={() => handleDeleteTask(editingTask.id)} 
                style={{ ...styles.taskDetailsButton, ...styles.deleteButton }}
              >
                Delete Task
              </button>
              <button 
                onClick={() => { setShowTaskDetails(false); setSelectedTask(null); setEditingTask(null); }} 
                style={{ ...styles.taskDetailsButton, ...styles.cancelButton }}
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateTask} 
                style={{ ...styles.taskDetailsButton, ...styles.updateButton }}
              >
                Update Task
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Task Modal */}
      {showAddTaskModal && (
        <AddTaskModal
          contact={contact}
          onClose={() => setShowAddTaskModal(false)}
          onTaskCreated={() => {
            setShowAddTaskModal(false);
            fetchContactTasks();
          }}
        />
      )}

      {/* Add Activity Modal */}
      {showAddActivityModal && (
        <AddActivityModalSimple
          contact={contact}
          onClose={() => setShowAddActivityModal(false)}
          onActivityAdded={() => {
            setShowAddActivityModal(false);
            fetchContactActivities(); // Refresh activities after creation
          }}
        />
      )}
    </>
  );
};

const AddActivityModalSimple = ({ contact, onClose, onActivityAdded }) => {
  const [activityData, setActivityData] = useState({
    type: 'call',
    description: '',
    contactId: contact?.id || null
  });

  const handleSubmit = async () => {
    try {
      const activityDataToSave = {
        ...activityData,
        date: new Date().toISOString(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await addDoc(collection(db, 'activities'), activityDataToSave);
      alert('Activity created successfully!');
      onActivityAdded();
    } catch (error) {
      console.error('Error creating activity:', error);
      alert('Failed to create activity: ' + error.message);
    }
  };

  const handleChange = (field, value) => {
    setActivityData(prev => ({ ...prev, [field]: value }));
  };

  if (!contact) return null;

  return (
    <div style={addActivityModalStyles.overlay}>
      <div style={addActivityModalStyles.modal}>
        <button style={addActivityModalStyles.closeButton} onClick={onClose}>&times;</button>
        <h2 style={addActivityModalStyles.title}>Add Activity for {contact.firstName} {contact.lastName}</h2>
        
        <div style={addActivityModalStyles.content}>
          <div style={addActivityModalStyles.fieldRow}>
            <label style={addActivityModalStyles.label}>Activity Type</label>
            <select
              value={activityData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              style={addActivityModalStyles.input}
            >
              <option value="call">Phone Call</option>
              <option value="email">Email</option>
              <option value="text">Text Message</option>
              <option value="meeting">Meeting</option>
              <option value="showing">Property Showing</option>
              <option value="follow_up">Follow Up</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div style={addActivityModalStyles.fieldRow}>
            <label style={addActivityModalStyles.label}>Description</label>
            <textarea
              value={activityData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              style={addActivityModalStyles.textarea}
              rows={4}
              placeholder="Describe the activity..."
            />
          </div>
        </div>

        <div style={addActivityModalStyles.actions}>
          <button onClick={onClose} style={addActivityModalStyles.cancelButton}>Cancel</button>
          <button onClick={handleSubmit} style={addActivityModalStyles.saveButton}>Create Activity</button>
        </div>
      </div>
    </div>
  );
};

const AddTaskModal = ({ contact, onClose, onTaskCreated }) => {
  const [taskData, setTaskData] = useState({
    title: `Task for ${contact?.firstName || ''} ${contact?.lastName || ''}`,
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    contactId: contact?.id || null,
    prospectId: null,
    prospectBusinessId: null
  });

  const handleSubmit = async () => {
    try {
      const taskDataToSave = {
        ...taskData,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await addDoc(collection(db, 'tasks'), taskDataToSave);
      alert('Task created successfully!');
      onTaskCreated();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task: ' + error.message);
    }
  };

  const handleChange = (field, value) => {
    setTaskData(prev => ({ ...prev, [field]: value }));
  };

  if (!contact) return null;

  return (
    <div style={addTaskModalStyles.overlay}>
      <div style={addTaskModalStyles.modal}>
        <button style={addTaskModalStyles.closeButton} onClick={onClose}>&times;</button>
        <h2 style={addTaskModalStyles.title}>Add Task for {contact.firstName} {contact.lastName}</h2>
        
        <div style={addTaskModalStyles.content}>
          <div style={addTaskModalStyles.fieldRow}>
            <label style={addTaskModalStyles.label}>Task Title</label>
            <input
              type="text"
              value={taskData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              style={addTaskModalStyles.input}
            />
          </div>

          <div style={addTaskModalStyles.fieldRow}>
            <label style={addTaskModalStyles.label}>Description</label>
            <textarea
              value={taskData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              style={addTaskModalStyles.textarea}
              rows={4}
            />
          </div>

          <div style={addTaskModalStyles.fieldRow}>
            <label style={addTaskModalStyles.label}>Due Date</label>
            <input
              type="date"
              value={taskData.dueDate}
              onChange={(e) => handleChange('dueDate', e.target.value)}
              style={addTaskModalStyles.input}
            />
          </div>

          <div style={addTaskModalStyles.fieldRow}>
            <label style={addTaskModalStyles.label}>Priority</label>
            <select
              value={taskData.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
              style={addTaskModalStyles.input}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div style={addTaskModalStyles.actions}>
          <button
            onClick={onClose}
            style={addTaskModalStyles.cancelButton}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={addTaskModalStyles.saveButton}
          >
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
};

const ModalField = ({ label, value, mode, onChange, textarea }) => (
  <div style={fieldStyles.fieldRow}>
    <label style={fieldStyles.label}>{label}:</label>
    {mode === 'edit' ? (
      textarea ? (
        <textarea
          style={fieldStyles.textarea}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      ) : (
        <input
          style={fieldStyles.input}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )
    ) : (
      <span style={fieldStyles.value}>{value && value.trim() ? value : '(Not specified)'}</span>
    )}
  </div>
);

const fieldStyles = {
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  label: {
    minWidth: 110,
    fontWeight: 500,
    color: '#444',
    fontSize: '1rem',
  },
  value: {
    color: '#222',
    fontSize: '1rem',
    fontFamily: 'Georgia, serif',
    wordBreak: 'break-word',
  },
  input: {
    flex: 1,
    padding: '7px 12px',
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: '1rem',
    fontFamily: 'Georgia, serif',
    background: 'rgba(255,255,255,0.7)',
    color: '#222',
    outline: 'none',
    transition: 'border 0.2s',
  },
  textarea: {
    flex: 1,
    padding: '7px 12px',
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: '1rem',
    fontFamily: 'Georgia, serif',
    background: 'rgba(255,255,255,0.7)',
    color: '#222',
    outline: 'none',
    transition: 'border 0.2s',
    resize: 'vertical',
    minHeight: '50px',
    maxHeight: '80px',
    overflowY: 'auto',
  },
};

const addActivityModalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 7000,
  },
  modal: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: '18px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    padding: '36px 48px 32px 48px',
    minWidth: '500px',
    maxWidth: '700px',
    width: '90vw',
    minHeight: '200px',
    maxHeight: '95vh',
    position: 'relative',
    fontFamily: 'Georgia, serif',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  closeButton: {
    position: 'absolute',
    top: '14px',
    right: '20px',
    background: '#222',
    border: 'none',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    fontSize: '1.7rem',
    color: '#fff',
    cursor: 'pointer',
    zIndex: 10,
    transition: 'background 0.2s',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
  },
  title: {
    fontSize: '1.45rem',
    fontWeight: 700,
    margin: '0 0 18px 0',
    color: '#23233a',
    letterSpacing: '0.01em',
    textAlign: 'center',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  fieldRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontWeight: 500,
    color: '#444',
    fontSize: '0.95rem',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '1rem',
    fontFamily: 'Georgia, serif',
    background: 'rgba(255,255,255,0.8)',
    outline: 'none',
    transition: 'border 0.2s',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '1rem',
    fontFamily: 'Georgia, serif',
    background: 'rgba(255,255,255,0.8)',
    outline: 'none',
    transition: 'border 0.2s',
    resize: 'vertical',
    minHeight: '80px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 25,
    gap: '12px',
  },
  cancelButton: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    color: '#222',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
    transition: 'background 0.2s',
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#222',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
    transition: 'background 0.2s',
    flex: 1,
  },
};

const addTaskModalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(30,30,40,0.18)',
    zIndex: 7000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    background: '#f8f6f1',
    borderRadius: '18px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    padding: '36px 32px 28px 32px',
    minWidth: '400px',
    maxWidth: '95vw',
    position: 'relative',
    fontFamily: 'Georgia, serif',
  },
  closeButton: {
    position: 'absolute',
    top: '14px',
    right: '20px',
    background: '#222',
    border: 'none',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    fontSize: '1.7rem',
    color: '#fff',
    cursor: 'pointer',
    zIndex: 10,
    transition: 'background 0.2s',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
  },
  title: {
    fontSize: '1.45rem',
    fontWeight: 700,
    margin: '0 0 18px 0',
    color: '#23233a',
    letterSpacing: '0.01em',
    textAlign: 'center',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  fieldRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontWeight: 500,
    color: '#444',
    fontSize: '0.95rem',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '1rem',
    fontFamily: 'Georgia, serif',
    background: 'rgba(255,255,255,0.8)',
    outline: 'none',
    transition: 'border 0.2s',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '1rem',
    fontFamily: 'Georgia, serif',
    background: 'rgba(255,255,255,0.8)',
    outline: 'none',
    transition: 'border 0.2s',
    resize: 'vertical',
    minHeight: '80px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 25,
    gap: '12px',
  },
  cancelButton: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    color: '#222',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
    transition: 'background 0.2s',
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#222',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
    transition: 'background 0.2s',
    flex: 1,
  },
};

export default ContactModal; 