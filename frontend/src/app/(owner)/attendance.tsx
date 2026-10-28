import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, Platform } from 'react-native';
import { Text, Card, Button, Surface, Chip, TextInput, Divider, Portal, Dialog, IconButton, Avatar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Print from 'expo-print';
import { DS } from '../../constants/designTokens';

interface Employee {
  id: string;
  name: string;
  role: string;
  phone: string;
  shift: 'Morning Shift' | 'Evening Shift' | 'Full Day';
  dailyRate: number;
  monthlySalary: number;
  attendance: Record<string, 'present' | 'absent' | 'half_day' | 'leave'>;
  overtimeHours: number;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    name: 'Rahul Sharma',
    role: 'Head Chef',
    phone: '9876543210',
    shift: 'Morning Shift',
    dailyRate: 900,
    monthlySalary: 27000,
    overtimeHours: 6,
    attendance: { Mon: 'present', Tue: 'present', Wed: 'present', Thu: 'present', Fri: 'present', Sat: 'half_day', Sun: 'leave' }
  },
  {
    id: 'emp-2',
    name: 'Sameer Khan',
    role: 'Cashier & POS Lead',
    phone: '9876543211',
    shift: 'Evening Shift',
    dailyRate: 750,
    monthlySalary: 22500,
    overtimeHours: 4,
    attendance: { Mon: 'present', Tue: 'present', Wed: 'present', Thu: 'present', Fri: 'present', Sat: 'present', Sun: 'absent' }
  },
  {
    id: 'emp-3',
    name: 'Priya Patel',
    role: 'Floor Manager',
    phone: '9876543212',
    shift: 'Full Day',
    dailyRate: 1000,
    monthlySalary: 30000,
    overtimeHours: 8,
    attendance: { Mon: 'present', Tue: 'present', Wed: 'present', Thu: 'present', Fri: 'present', Sat: 'present', Sun: 'leave' }
  },
  {
    id: 'emp-4',
    name: 'Amit Kumar',
    role: 'Kitchen Helper & Store Cleaner',
    phone: '9876543213',
    shift: 'Morning Shift',
    dailyRate: 600,
    monthlySalary: 18000,
    overtimeHours: 2,
    attendance: { Mon: 'present', Tue: 'half_day', Wed: 'present', Thu: 'present', Fri: 'present', Sat: 'present', Sun: 'leave' }
  },
];

export default function AttendoAttendanceScreen() {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('bharatpos_attendo_staff');
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return INITIAL_EMPLOYEES;
  });

  const [activeTab, setActiveTab] = useState<'attendance' | 'payroll'>('attendance');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpSalary, setNewEmpSalary] = useState('22000');
  const [newEmpShift, setNewEmpShift] = useState<Employee['shift']>('Morning Shift');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('bharatpos_attendo_staff', JSON.stringify(employees));
      } catch (_) {}
    }
  }, [employees]);

  // Toggle status cycling: present -> half_day -> absent -> leave -> present
  const cycleAttendance = (empId: string, day: string) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === empId) {
        const current = emp.attendance[day] || 'absent';
        let next: Employee['attendance'][string] = 'present';
        if (current === 'present') next = 'half_day';
        else if (current === 'half_day') next = 'absent';
        else if (current === 'absent') next = 'leave';
        else next = 'present';

        return {
          ...emp,
          attendance: { ...emp.attendance, [day]: next }
        };
      }
      return emp;
    }));
  };

  const stats = useMemo(() => {
    let totalPresentToday = 0;
    let totalOnLeave = 0;
    let totalPayrollEstimated = 0;

    employees.forEach(emp => {
      const todayStatus = emp.attendance['Mon'] || 'present';
      if (todayStatus === 'present' || todayStatus === 'half_day') totalPresentToday++;
      if (todayStatus === 'leave' || todayStatus === 'absent') totalOnLeave++;

      // Compute present days
      let daysPresent = 0;
      Object.values(emp.attendance).forEach(st => {
        if (st === 'present') daysPresent += 1;
        if (st === 'half_day') daysPresent += 0.5;
      });

      const weeklyPay = Math.round(daysPresent * emp.dailyRate + (emp.overtimeHours * 100));
      totalPayrollEstimated += weeklyPay;
    });

    return { totalPresentToday, totalOnLeave, totalStaff: employees.length, totalPayrollEstimated };
  }, [employees]);

  const handleAddEmployee = () => {
    if (!newEmpName.trim()) {
      Alert.alert('Required', 'Please enter employee name');
      return;
    }
    const salary = Number(newEmpSalary) || 20000;
    const newEmp: Employee = {
      id: 'emp-' + Date.now(),
      name: newEmpName.trim(),
      role: newEmpRole.trim() || 'Staff Member',
      phone: newEmpPhone.trim() || '9876543210',
      shift: newEmpShift,
      monthlySalary: salary,
      dailyRate: Math.round(salary / 26),
      overtimeHours: 0,
      attendance: { Mon: 'present', Tue: 'present', Wed: 'present', Thu: 'present', Fri: 'present', Sat: 'present', Sun: 'leave' }
    };
    setEmployees([...employees, newEmp]);
    setNewEmpName('');
    setNewEmpRole('');
    setShowAddModal(false);
    Alert.alert('Employee Added', `${newEmp.name} added to roster.`);
  };

  const handlePrintPayslip = async (emp: Employee) => {
    let presentDays = 0;
    Object.values(emp.attendance).forEach(st => {
      if (st === 'present') presentDays += 1;
      if (st === 'half_day') presentDays += 0.5;
    });
    const overtimeBonus = emp.overtimeHours * 120;
    const grossSalary = Math.round(presentDays * emp.dailyRate + overtimeBonus);
    const pfDeduction = Math.round(grossSalary * 0.05);
    const netSalary = grossSalary - pfDeduction;

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: auto;">
          <div style="text-align: center; border-bottom: 2px solid #16A34A; padding-bottom: 12px;">
            <h2 style="margin: 0; color: #16A34A;">BHARATPOS RETAIL STORES</h2>
            <p style="margin: 4px 0; font-size: 13px; color: #64748B;">Staff Payslip & Attendance Summary</p>
          </div>
          <div style="margin-top: 16px; font-size: 14px;">
            <p><b>Employee:</b> ${emp.name} | <b>Designation:</b> ${emp.role}</p>
            <p><b>Shift:</b> ${emp.shift} | <b>Contact:</b> ${emp.phone}</p>
            <p><b>Pay Period:</b> Current Week / Month Summary</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px;">
            <tr style="background: #F1F5F9; border-bottom: 1px solid #CBD5E1;">
              <th style="text-align: left; padding: 8px;">Component</th>
              <th style="text-align: right; padding: 8px;">Amount</th>
            </tr>
            <tr><td style="padding: 8px;">Days Worked (${presentDays} days @ ₹${emp.dailyRate}/day)</td><td style="text-align: right;">₹${presentDays * emp.dailyRate}</td></tr>
            <tr><td style="padding: 8px;">Overtime Bonus (${emp.overtimeHours} hrs @ ₹120/hr)</td><td style="text-align: right;">₹${overtimeBonus}</td></tr>
            <tr style="color: #DC2626;"><td style="padding: 8px;">Statutory Deductions / Advance</td><td style="text-align: right;">-₹${pfDeduction}</td></tr>
            <tr style="border-top: 2px solid #000; font-weight: bold; font-size: 15px;">
              <td style="padding: 10px 8px;">Net Payable Payout</td>
              <td style="text-align: right; padding: 10px 8px; color: #16A34A;">₹${netSalary}</td>
            </tr>
          </table>
          <p style="margin-top: 24px; font-size: 11px; color: #94A3B8; text-align: center;">Generated automatically by BharatPOS Attendo Payroll Engine</p>
        </body>
      </html>
    `;

    try {
      await Print.printAsync({ html });
    } catch (_) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const w = window.open('', '_blank');
        if (w) {
          w.document.write(html);
          w.document.close();
          w.print();
        }
      }
    }
  };

  const renderAttendanceBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <View style={[styles.attBadge, { backgroundColor: '#DCFCE7' }]}><Icon name="check" size={14} color="#16A34A" /></View>;
      case 'half_day':
        return <View style={[styles.attBadge, { backgroundColor: '#FEF3C7' }]}><Text style={{ fontSize: 9, fontWeight: '800', color: '#D97706' }}>1/2</Text></View>;
      case 'absent':
        return <View style={[styles.attBadge, { backgroundColor: '#FEE2E2' }]}><Icon name="close" size={14} color="#DC2626" /></View>;
      case 'leave':
        return <View style={[styles.attBadge, { backgroundColor: '#E0F2FE' }]}><Text style={{ fontSize: 9, fontWeight: '800', color: '#0284C7' }}>PL</Text></View>;
      default:
        return <View style={[styles.attBadge, { backgroundColor: '#F1F5F9' }]}><Text style={{ fontSize: 9, color: '#94A3B8' }}>TAP</Text></View>;
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Toolbar */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.headerIcon}>
            <Icon name="badge-account-horizontal-outline" size={24} color="#16A34A" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Bharat Attendo — Staff Attendance & Payroll</Text>
            <Text style={styles.headerSubtitle}>Shift scheduling, one-tap attendance matrix & automated salary slips</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            mode="contained"
            icon="account-plus"
            buttonColor="#16A34A"
            labelStyle={{ fontWeight: '700' }}
            onPress={() => setShowAddModal(true)}
          >
            Add Staff Member
          </Button>
        </View>
      </View>

      {/* 2. Shift & Staff Stats Row */}
      <View style={styles.shiftCardsRow}>
        <Surface style={styles.shiftCard} elevation={1}>
          <View style={styles.shiftIconBox}>
            <Icon name="weather-sunny" size={20} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shiftName}>Morning Shift</Text>
            <Text style={styles.shiftTime}>07:30 AM to 03:00 PM</Text>
          </View>
          <Chip compact style={{ backgroundColor: '#DCFCE7' }} textStyle={{ fontSize: 10, color: '#16A34A' }}>Active</Chip>
        </Surface>

        <Surface style={styles.shiftCard} elevation={1}>
          <View style={[styles.shiftIconBox, { backgroundColor: '#EDE9FE' }]}>
            <Icon name="weather-night" size={20} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shiftName}>Evening Shift</Text>
            <Text style={styles.shiftTime}>03:00 PM to 11:30 PM</Text>
          </View>
          <Chip compact style={{ backgroundColor: '#F1F5F9' }} textStyle={{ fontSize: 10, color: '#64748B' }}>Next</Chip>
        </Surface>

        <Surface style={[styles.shiftCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]} elevation={1}>
          <View style={[styles.shiftIconBox, { backgroundColor: '#DCFCE7' }]}>
            <Icon name="cash-fast" size={20} color="#16A34A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shiftName}>Estimated Weekly Payroll</Text>
            <Text style={[styles.shiftTime, { color: '#16A34A', fontWeight: '800', fontSize: 14 }]}>
              ₹{stats.totalPayrollEstimated.toLocaleString('en-IN')}
            </Text>
          </View>
        </Surface>
      </View>

      {/* 3. Sub Tabs: Attendance Matrix vs Payroll Ledger */}
      <View style={styles.tabToggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, activeTab === 'attendance' && styles.toggleBtnActive]}
          onPress={() => setActiveTab('attendance')}
        >
          <Icon name="calendar-check" size={16} color={activeTab === 'attendance' ? '#FFFFFF' : '#64748B'} />
          <Text style={[styles.toggleBtnText, activeTab === 'attendance' && styles.toggleBtnTextActive]}>
            Weekly Attendance Matrix (Tap to Toggle)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, activeTab === 'payroll' && styles.toggleBtnActive]}
          onPress={() => setActiveTab('payroll')}
        >
          <Icon name="calculator-variant" size={16} color={activeTab === 'payroll' ? '#FFFFFF' : '#64748B'} />
          <Text style={[styles.toggleBtnText, activeTab === 'payroll' && styles.toggleBtnTextActive]}>
            Salary Calculation & Payslips
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. Tab Content */}
      {activeTab === 'attendance' ? (
        <Surface style={styles.tableCard} elevation={1}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableColHeader, { width: 180 }]}>Staff Member</Text>
            <Text style={[styles.tableColHeader, { width: 120 }]}>Shift</Text>
            {DAYS_OF_WEEK.map(d => (
              <Text key={d} style={[styles.tableColHeader, { width: 56, textAlign: 'center' }]}>{d}</Text>
            ))}
            <Text style={[styles.tableColHeader, { width: 100, textAlign: 'right' }]}>Days Present</Text>
          </View>
          <Divider />

          <ScrollView showsVerticalScrollIndicator={false}>
            {employees.map(emp => {
              let presentCount = 0;
              Object.values(emp.attendance).forEach(st => {
                if (st === 'present') presentCount += 1;
                if (st === 'half_day') presentCount += 0.5;
              });

              return (
                <View key={emp.id} style={styles.tableRow}>
                  <View style={{ width: 180, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Avatar.Text size={32} label={emp.name[0]} style={{ backgroundColor: '#DCFCE7' }} labelStyle={{ color: '#16A34A', fontSize: 13, fontWeight: '700' }} />
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{emp.name}</Text>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>{emp.role}</Text>
                    </View>
                  </View>

                  <View style={{ width: 120 }}>
                    <Text style={{ fontSize: 12, color: '#334155', fontWeight: '500' }}>{emp.shift}</Text>
                  </View>

                  {DAYS_OF_WEEK.map(day => (
                    <TouchableOpacity
                      key={day}
                      style={{ width: 56, alignItems: 'center', justifyContent: 'center' }}
                      onPress={() => cycleAttendance(emp.id, day)}
                      activeOpacity={0.7}
                    >
                      {renderAttendanceBadge(emp.attendance[day] || 'present')}
                    </TouchableOpacity>
                  ))}

                  <View style={{ width: 100, alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#16A34A' }}>
                      {presentCount} / 7 days
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.legendRow}>
            <Text style={{ fontSize: 11, color: '#64748B' }}>Tap any day cell to cycle status:</Text>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={[styles.attBadge, { backgroundColor: '#DCFCE7', width: 18, height: 18 }]}><Icon name="check" size={10} color="#16A34A" /></View>
                <Text style={{ fontSize: 11, color: '#475569' }}>Present</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={[styles.attBadge, { backgroundColor: '#FEF3C7', width: 18, height: 18 }]}><Text style={{ fontSize: 8, fontWeight: 'bold', color: '#D97706' }}>1/2</Text></View>
                <Text style={{ fontSize: 11, color: '#475569' }}>Half Day</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={[styles.attBadge, { backgroundColor: '#FEE2E2', width: 18, height: 18 }]}><Icon name="close" size={10} color="#DC2626" /></View>
                <Text style={{ fontSize: 11, color: '#475569' }}>Absent</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={[styles.attBadge, { backgroundColor: '#E0F2FE', width: 18, height: 18 }]}><Text style={{ fontSize: 8, fontWeight: 'bold', color: '#0284C7' }}>PL</Text></View>
                <Text style={{ fontSize: 11, color: '#475569' }}>Paid Leave</Text>
              </View>
            </View>
          </View>
        </Surface>
      ) : (
        <Surface style={styles.tableCard} elevation={1}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableColHeader, { flex: 1.5 }]}>Employee</Text>
            <Text style={[styles.tableColHeader, { flex: 1 }]}>Daily Rate</Text>
            <Text style={[styles.tableColHeader, { flex: 1 }]}>Days Worked</Text>
            <Text style={[styles.tableColHeader, { flex: 1 }]}>Overtime</Text>
            <Text style={[styles.tableColHeader, { flex: 1.2, textAlign: 'right' }]}>Net Payout</Text>
            <Text style={[styles.tableColHeader, { width: 120, textAlign: 'center' }]}>Payslip</Text>
          </View>
          <Divider />

          <ScrollView showsVerticalScrollIndicator={false}>
            {employees.map(emp => {
              let presentCount = 0;
              Object.values(emp.attendance).forEach(st => {
                if (st === 'present') presentCount += 1;
                if (st === 'half_day') presentCount += 0.5;
              });

              const basePay = Math.round(presentCount * emp.dailyRate);
              const overtimePay = emp.overtimeHours * 120;
              const netPay = basePay + overtimePay;

              return (
                <View key={emp.id} style={styles.tableRow}>
                  <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Avatar.Text size={32} label={emp.name[0]} style={{ backgroundColor: '#DCFCE7' }} labelStyle={{ color: '#16A34A', fontSize: 13, fontWeight: '700' }} />
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{emp.name}</Text>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>₹{emp.monthlySalary.toLocaleString()}/mo</Text>
                    </View>
                  </View>

                  <Text style={{ flex: 1, fontSize: 13, color: '#334155' }}>₹{emp.dailyRate}/day</Text>
                  <Text style={{ flex: 1, fontSize: 13, color: '#334155', fontWeight: '600' }}>{presentCount} days</Text>
                  <Text style={{ flex: 1, fontSize: 13, color: '#334155' }}>{emp.overtimeHours} hrs (₹{overtimePay})</Text>

                  <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#16A34A' }}>
                      ₹{netPay.toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View style={{ width: 120, alignItems: 'center' }}>
                    <Button
                      mode="outlined"
                      compact
                      icon="download"
                      labelStyle={{ fontSize: 11 }}
                      onPress={() => handlePrintPayslip(emp)}
                    >
                      Payslip
                    </Button>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </Surface>
      )}

      {/* 5. Add Employee Dialog */}
      <Portal>
        <Dialog visible={showAddModal} onDismiss={() => setShowAddModal(false)} style={styles.dialog}>
          <Dialog.Title style={{ fontWeight: '800' }}>Add Employee to Roster</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Full Name"
              value={newEmpName}
              onChangeText={setNewEmpName}
              mode="outlined"
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Role / Designation (e.g. Cashier, Chef, Waiter)"
              value={newEmpRole}
              onChangeText={setNewEmpRole}
              mode="outlined"
              style={{ marginBottom: 12 }}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <TextInput
                label="Mobile Number"
                value={newEmpPhone}
                onChangeText={setNewEmpPhone}
                mode="outlined"
                style={{ flex: 1 }}
              />
              <TextInput
                label="Monthly Salary (₹)"
                value={newEmpSalary}
                onChangeText={setNewEmpSalary}
                keyboardType="numeric"
                mode="outlined"
                style={{ flex: 1 }}
              />
            </View>

            <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Shift Assignment</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['Morning Shift', 'Evening Shift', 'Full Day'] as const).map(s => (
                <Chip
                  key={s}
                  selected={newEmpShift === s}
                  onPress={() => setNewEmpShift(s)}
                  style={{ backgroundColor: newEmpShift === s ? '#DCFCE7' : '#F1F5F9' }}
                >
                  {s}
                </Chip>
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAddModal(false)}>Cancel</Button>
            <Button mode="contained" buttonColor="#16A34A" onPress={handleAddEmployee}>Save Staff</Button>
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
    backgroundColor: '#DCFCE7',
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
  shiftCardsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  shiftCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shiftIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shiftName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  shiftTime: {
    fontSize: 11,
    color: '#64748B',
  },
  tabToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  toggleBtnActive: {
    backgroundColor: '#16A34A',
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tableColHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  attBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    flexWrap: 'wrap',
    gap: 8,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxWidth: 500,
    alignSelf: 'center',
    width: '90%',
  },
});
