import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform, Alert } from 'react-native';
import { Text, Card, Button, Surface, Chip, TextInput, Divider, Portal, Dialog, IconButton, ProgressBar, Badge } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { DS } from '../../constants/designTokens';

interface SOPTask {
  id: string;
  title: string;
  department: 'Kitchen' | 'Cleaning' | 'Inventory' | 'Equipment' | 'Cash Counter';
  shift: 'Morning' | 'Evening' | 'General';
  dueTime: string;
  assignedTo: string;
  priority: 'Urgent' | 'High' | 'Normal';
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

const INITIAL_TASKS: SOPTask[] = [
  { id: 'tsk-1', title: 'Deep Freezer & AC Servicing / Temperature Log', department: 'Equipment', shift: 'Morning', dueTime: '08:30 AM', assignedTo: 'Sameer Khan', priority: 'High', isCompleted: true, completedAt: '08:24 AM', completedBy: 'Sameer Khan' },
  { id: 'tsk-2', title: 'POS Thermal Printer Roll & USB Gun Barcode Test', department: 'Cash Counter', shift: 'Morning', dueTime: '09:00 AM', assignedTo: 'Priya Patel', priority: 'Urgent', isCompleted: true, completedAt: '08:55 AM', completedBy: 'Priya Patel' },
  { id: 'tsk-3', title: 'Kitchen Exhaust, Chimney & Gas Leak Safety Check', department: 'Kitchen', shift: 'Morning', dueTime: '09:15 AM', assignedTo: 'Chef Rahul', priority: 'Urgent', isCompleted: false },
  { id: 'tsk-4', title: 'Dining Area Sanitization & Tables Deep Cleaning', department: 'Cleaning', shift: 'Morning', dueTime: '10:00 AM', assignedTo: 'Amit Kumar', priority: 'High', isCompleted: true, completedAt: '09:48 AM', completedBy: 'Amit Kumar' },
  { id: 'tsk-5', title: 'Daily Perishable Stock Audit (Dairy, Vegetables, Meat)', department: 'Inventory', shift: 'Morning', dueTime: '11:00 AM', assignedTo: 'Sameer Khan', priority: 'Normal', isCompleted: false },
  { id: 'tsk-6', title: 'Store AC Servicing & Filter De-dusting', department: 'Equipment', shift: 'Evening', dueTime: '04:30 PM', assignedTo: 'Technician', priority: 'High', isCompleted: false },
  { id: 'tsk-7', title: 'Evening Cash Drawer Float Count (₹5,000 float target)', department: 'Cash Counter', shift: 'Evening', dueTime: '06:00 PM', assignedTo: 'Priya Patel', priority: 'Urgent', isCompleted: false },
  { id: 'tsk-8', title: 'Kitchen Sanitization & Prep Station Wipe Down', department: 'Kitchen', shift: 'Evening', dueTime: '10:30 PM', assignedTo: 'Chef Rahul', priority: 'High', isCompleted: false },
  { id: 'tsk-9', title: 'Daily Day Book & Cash-in-Hand Signoff with Manager', department: 'Cash Counter', shift: 'Evening', dueTime: '11:00 PM', assignedTo: 'Store Manager', priority: 'Urgent', isCompleted: false },
];

export default function StepwiseTasksScreen() {
  const [tasks, setTasks] = useState<SOPTask[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('bharatpos_stepwise_tasks');
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return INITIAL_TASKS;
  });

  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedShift, setSelectedShift] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // New task form
  const [newTitle, setNewTitle] = useState('');
  const [newDept, setNewDept] = useState<SOPTask['department']>('Kitchen');
  const [newShift, setNewShift] = useState<SOPTask['shift']>('Morning');
  const [newDueTime, setNewDueTime] = useState('10:00 AM');
  const [newAssigned, setNewAssigned] = useState('Rahul');
  const [newPriority, setNewPriority] = useState<SOPTask['priority']>('Normal');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('bharatpos_stepwise_tasks', JSON.stringify(tasks));
      } catch (_) {}
    }
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchDept = selectedDept === 'All' || t.department === selectedDept;
      const matchShift = selectedShift === 'All' || t.shift === selectedShift;
      return matchDept && matchShift;
    });
  }, [tasks, selectedDept, selectedShift]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.isCompleted).length;
    const pending = total - completed;
    const progress = total > 0 ? completed / total : 0;
    return { total, completed, pending, progress };
  }, [tasks]);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextState = !t.isCompleted;
        return {
          ...t,
          isCompleted: nextState,
          completedAt: nextState ? new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : undefined,
          completedBy: nextState ? 'Admin Signed' : undefined,
        };
      }
      return t;
    }));
  };

  const handleAddTask = () => {
    if (!newTitle.trim()) {
      Alert.alert('Required', 'Please enter task title.');
      return;
    }
    const newTask: SOPTask = {
      id: 'tsk-' + Date.now(),
      title: newTitle.trim(),
      department: newDept,
      shift: newShift,
      dueTime: newDueTime,
      assignedTo: newAssigned,
      priority: newPriority,
      isCompleted: false,
    };
    setTasks([newTask, ...tasks]);
    setNewTitle('');
    setShowAddModal(false);
    Alert.alert('Task Created', `Task "${newTask.title}" added to ${newTask.department} checklist.`);
  };

  const getDeptIcon = (dept: SOPTask['department']) => {
    switch (dept) {
      case 'Kitchen': return 'chef-hat';
      case 'Cleaning': return 'broom';
      case 'Equipment': return 'cog-sync';
      case 'Inventory': return 'package-variant';
      case 'Cash Counter': return 'cash-register';
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Toolbar */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.headerIcon}>
            <Icon name="checkbox-marked-circle-auto-outline" size={24} color="#0284C7" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Bharat Stepwise — Store SOPs & Tasks</Text>
            <Text style={styles.headerSubtitle}>Supervise daily store opening, machine servicing, cleanliness & audits</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            mode="contained"
            icon="plus"
            buttonColor="#0284C7"
            labelStyle={{ fontWeight: '700' }}
            onPress={() => setShowAddModal(true)}
          >
            Create Task SOP
          </Button>
        </View>
      </View>

      {/* 2. Petpooja Tasks Status Banner */}
      <Surface style={styles.statusBanner} elevation={1}>
        <View style={styles.bannerRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                Daily Checklist Compliance
              </Text>
              <Badge style={{ backgroundColor: '#0284C7' }}>{Math.round(stats.progress * 100)}%</Badge>
            </View>
            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }}>
              <b>{stats.completed}</b> of <b>{stats.total}</b> tasks verified and completed today • <b>{stats.pending}</b> pending
            </Text>
            <ProgressBar progress={stats.progress} color="#0284C7" style={{ height: 8, borderRadius: 4, backgroundColor: '#E0F2FE' }} />
          </View>

          <View style={styles.quickDatePill}>
            <Icon name="calendar-today" size={16} color="#0284C7" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>
      </Surface>

      {/* 3. Filters: Departments & Shifts */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {['All', 'Kitchen', 'Cleaning', 'Equipment', 'Inventory', 'Cash Counter'].map(dept => (
            <TouchableOpacity
              key={dept}
              style={[styles.filterChip, selectedDept === dept && styles.filterChipActive]}
              onPress={() => setSelectedDept(dept)}
            >
              <Text style={[styles.filterChipText, selectedDept === dept && styles.filterChipTextActive]}>{dept}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 4. Tasks List */}
      <ScrollView contentContainerStyle={styles.taskList} showsVerticalScrollIndicator={false}>
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Icon name="check-all" size={48} color="#94A3B8" />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#475569', marginTop: 12 }}>All tasks in this department are clear!</Text>
          </View>
        ) : (
          filteredTasks.map(task => {
            const isDone = task.isCompleted;
            return (
              <Surface key={task.id} style={[styles.taskCard, isDone && styles.taskCardDone]} elevation={1}>
                <View style={styles.taskCardLeft}>
                  <TouchableOpacity
                    style={[styles.checkbox, isDone && styles.checkboxDone]}
                    onPress={() => toggleTask(task.id)}
                  >
                    {isDone ? <Icon name="check" size={16} color="#FFFFFF" /> : null}
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                      <Chip compact icon={getDeptIcon(task.department)} style={styles.deptBadge} textStyle={{ fontSize: 10 }}>
                        {task.department}
                      </Chip>
                      <Chip compact style={[styles.priorityBadge, task.priority === 'Urgent' ? styles.urgentBadge : task.priority === 'High' ? styles.highBadge : styles.normalBadge]} textStyle={{ fontSize: 10 }}>
                        {task.priority}
                      </Chip>
                      <Text style={styles.timeTag}>
                        <Icon name="clock-outline" size={12} color="#64748B" /> Due: {task.dueTime}
                      </Text>
                    </View>

                    <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>
                      {task.title}
                    </Text>

                    <Text style={styles.assigneeText}>
                      Assigned: <b>{task.assignedTo}</b> ({task.shift} Shift)
                      {task.completedAt ? ` • Done at ${task.completedAt}` : ''}
                    </Text>
                  </View>
                </View>

                <Button
                  mode={isDone ? 'outlined' : 'contained'}
                  buttonColor={isDone ? undefined : '#0284C7'}
                  textColor={isDone ? '#64748B' : '#FFFFFF'}
                  labelStyle={{ fontSize: 12, fontWeight: '700' }}
                  style={{ borderRadius: 8 }}
                  onPress={() => toggleTask(task.id)}
                >
                  {isDone ? 'Reopen Task' : 'Finish Task'}
                </Button>
              </Surface>
            );
          })
        )}
      </ScrollView>

      {/* 5. Add Task Dialog */}
      <Portal>
        <Dialog visible={showAddModal} onDismiss={() => setShowAddModal(false)} style={styles.dialog}>
          <Dialog.Title style={{ fontWeight: '800' }}>Add Store SOP / Task</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Task Title / Checklist Description"
              value={newTitle}
              onChangeText={setNewTitle}
              mode="outlined"
              style={{ marginBottom: 12 }}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <TextInput
                label="Due Time"
                value={newDueTime}
                onChangeText={setNewDueTime}
                mode="outlined"
                style={{ flex: 1 }}
              />
              <TextInput
                label="Assigned To"
                value={newAssigned}
                onChangeText={setNewAssigned}
                mode="outlined"
                style={{ flex: 1 }}
              />
            </View>

            <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Department</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 12 }}>
              {(['Kitchen', 'Cleaning', 'Equipment', 'Inventory', 'Cash Counter'] as const).map(d => (
                <Chip
                  key={d}
                  selected={newDept === d}
                  onPress={() => setNewDept(d)}
                  style={{ backgroundColor: newDept === d ? '#E0F2FE' : '#F1F5F9' }}
                >
                  {d}
                </Chip>
              ))}
            </ScrollView>

            <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Priority</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['Normal', 'High', 'Urgent'] as const).map(p => (
                <Chip
                  key={p}
                  selected={newPriority === p}
                  onPress={() => setNewPriority(p)}
                  style={{ backgroundColor: newPriority === p ? '#FEF3C7' : '#F1F5F9' }}
                >
                  {p}
                </Chip>
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAddModal(false)}>Cancel</Button>
            <Button mode="contained" buttonColor="#0284C7" onPress={handleAddTask}>Add Task</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Plus Jakarta Sans',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  statusBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  quickDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
  },
  filterBar: {
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: '#0284C7',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  taskList: {
    gap: 10,
    paddingBottom: 40,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  taskCardDone: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.8,
  },
  taskCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxDone: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  deptBadge: {
    backgroundColor: '#F1F5F9',
    height: 22,
  },
  priorityBadge: {
    height: 22,
  },
  normalBadge: {
    backgroundColor: '#F1F5F9',
  },
  highBadge: {
    backgroundColor: '#FEF3C7',
  },
  urgentBadge: {
    backgroundColor: '#FEE2E2',
  },
  timeTag: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 4,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  assigneeText: {
    fontSize: 11,
    color: '#64748B',
  },
  emptyWrap: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxWidth: 500,
    alignSelf: 'center',
    width: '90%',
  },
});
