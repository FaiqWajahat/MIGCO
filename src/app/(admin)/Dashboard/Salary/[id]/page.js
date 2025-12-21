'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Download, Plus, X, Save, Calculator, DollarSign, 
  Calendar, Trash2, ArrowLeft, Briefcase, 
  AlertCircle, CheckCircle2, FileText, Receipt
} from 'lucide-react';
import DashboardPageHeader from "@/Components/DashboardPageHeader";
import CustomDropdown from "@/Components/CustomDropdown";
import axios from 'axios';
import { errorToast, successToast } from '@/lib/toast';
import CustomLoader from '@/Components/CustomLoader';

export default function EmployeeSalaryPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params?.id;

  // --- State Management ---
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false); 
  const [deleting, setDeleting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null); 
  
  const [employee, setEmployee] = useState(null);
  const [salaryRecords, setSalaryRecords] = useState([]);
  const [pendingExpenses, setPendingExpenses] = useState([]); 
  
  // Stores { "expenseId": amountToDeduct }
  const [expenseAllocations, setExpenseAllocations] = useState({}); 

  // UI States
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    monthReference: '', 
    fromDate: '',
    toDate: '',
    baseSalary: '',
    absentDays: '0',
    manualExpenses: [], // Ad-hoc expenses not in DB
    deductions: '0', 
    allowances: '0', 
    notes: '',
    status: "Pending",
    employeeId: '' 
  });

  const [calculatedData, setCalculatedData] = useState(null);

  // --- API Functions ---

  const fetchEmployeeData = useCallback(async () => {
    try {
      const response = await axios.get(`/api/employee/getEmployee/${employeeId}`);
      if (!response.data.success) throw new Error(response.data.message);
      
      const emp = response.data.employee;
      setEmployee(emp);
      
      // Initialize form with employee ID
      setFormData(prev => ({ 
        ...prev, 
        baseSalary: emp.salary, 
        employeeId: emp._id 
      }));
    } catch (error) {
      errorToast(error.message || "Failed to load employee");
      router.push("/Dashboard/Employees");
    }
  }, [employeeId, router]);

  const fetchPendingExpenses = useCallback(async () => {
    try {
      const response = await axios.get(`/api/employee/expenses?employeeId=${employeeId}&limit=100`);
      if (response.data.success) {
        // Filter: Get expenses that are NOT fully paid (Completed) and NOT already deducted
        const activeExpenses = response.data.data.expenses.filter(e => e.status !== 'Completed' && e.status !== 'Deducted');
        setPendingExpenses(activeExpenses);

        // Initialize allocations: Default to deducting the FULL remaining amount
        const initialAllocations = {};
        activeExpenses.forEach(exp => {
            const remaining = exp.amount - (exp.paidAmount || 0);
            initialAllocations[exp._id] = remaining; 
        });
        setExpenseAllocations(initialAllocations);
      }
    } catch (error) {
      console.error("Error fetching expenses", error);
    }
  }, [employeeId]);

  const fetchSalaryRecords = useCallback(async () => {
    try {
      const response = await axios.get(`/api/salary/${employeeId}`);
      if (response.data.success) {
        setSalaryRecords(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching records", error);
    }
  }, [employeeId]);

  // --- Initial Data Fetching ---
  useEffect(() => {
    if (employeeId) {
      setLoading(true);
      Promise.all([fetchEmployeeData(), fetchSalaryRecords(), fetchPendingExpenses()])
        .finally(() => setLoading(false));
    }
  }, [employeeId, fetchEmployeeData, fetchSalaryRecords, fetchPendingExpenses]);

  // --- Logic & Calculations ---

  const handleMonthSelect = (e) => {
    const date = new Date(e.target.value);
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const formatDateInput = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    setFormData(prev => ({
      ...prev,
      monthReference: e.target.value,
      fromDate: formatDateInput(firstDay),
      toDate: formatDateInput(lastDay)
    }));
  };

  // Handle manual input change in the DB Expenses table
  const handleAllocationChange = (expenseId, value, maxAmount) => {
    let numValue = parseFloat(value);
    if (isNaN(numValue)) numValue = 0;
    
    // Validation: Don't allow deducting more than is owed
    if (numValue > maxAmount) numValue = maxAmount;
    if (numValue < 0) numValue = 0;

    setExpenseAllocations(prev => ({
        ...prev,
        [expenseId]: numValue
    }));
  };

  const handleCalculate = useCallback(() => {
    const { fromDate, toDate, baseSalary, absentDays, manualExpenses, deductions, allowances } = formData;
    
    if (!fromDate || !toDate) return;

    const base = parseFloat(baseSalary) || 0;
    const absent = parseFloat(absentDays) || 0;
    const extraDeduct = parseFloat(deductions) || 0;
    const extraAllow = parseFloat(allowances) || 0;

    // 1. Absent Deduction
    const dailyRate = base / 30; 
    const absentDeduction = dailyRate * absent;
    
    // 2. Manual Ad-hoc Expenses
    const manualExpensesTotal = manualExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

    // 3. Database Expenses (Sum of user inputs in allocations)
    const dbExpensesTotal = Object.values(expenseAllocations).reduce((sum, val) => sum + val, 0);

    // 4. Total Deductions
    const totalDeductions = absentDeduction + manualExpensesTotal + dbExpensesTotal + extraDeduct;
    
    // 5. Net Salary
    const netSalary = (base + extraAllow) - totalDeductions;

    // 6. Prepare Payload for Backend
    // Only send expenses that have an amount > 0 allocated
    const linkedExpensesPayload = Object.entries(expenseAllocations)
        .filter(([_, amount]) => amount > 0)
        .map(([id, amount]) => ({ expenseId: id, amount: amount }));

    setCalculatedData({
      ...formData,
      baseSalary: base,
      absentDays: absent,
      absentDeduction,
      manualExpensesTotal,
      dbExpensesTotal,
      extraDeductions: extraDeduct,
      extraAllowances: extraAllow,
      totalDeductions,
      netSalary: Math.max(0, netSalary),
      linkedExpenses: linkedExpensesPayload 
    });
  }, [formData, expenseAllocations]);

  // Auto-calculate trigger
  useEffect(() => {
    if(formData.fromDate && formData.toDate) {
      handleCalculate();
    }
  }, [handleCalculate, formData.fromDate, formData.toDate, expenseAllocations]);

  // --- Database Actions ---

  const resetForm = () => {
    setFormData({
      monthReference: '',
      fromDate: '',
      toDate: '',
      baseSalary: employee?.salary || '', 
      employeeId: employee?._id || employeeId, 
      absentDays: '0',
      manualExpenses: [],
      deductions: '0',
      allowances: '0',
      notes: '',
      status: "Pending"
    });
    
    // Re-initialize allocations from pendingExpenses
    const initialAllocations = {};
    pendingExpenses.forEach(exp => {
        initialAllocations[exp._id] = exp.amount - (exp.paidAmount || 0);
    });
    setExpenseAllocations(initialAllocations);

    setCalculatedData(null);
    setShowCalculator(false);
  };

  const handleSaveRecord = async (status = 'Pending') => {
    if (!calculatedData) {
      errorToast("Please fill in the date range first");
      return;
    }

    const finalPayload = { 
        ...calculatedData, 
        employeeId: calculatedData.employeeId || employee?._id || employeeId,
        status, 
        paidDate: status === 'Paid' ? new Date() : null,
        // Backend must accept 'linkedExpenses' as [{ expenseId, amount }]
        linkedExpenses: calculatedData.linkedExpenses 
    };

    try {
      setPaying(true);
      
      const response = await axios.post("/api/salary/add", finalPayload);

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      successToast(status === 'Paid' ? "Salary processed & expenses updated" : "Draft saved successfully");

      setSalaryRecords(prev => [response.data.data, ...prev]);
      
      // If Paid, refresh pending expenses (as amounts/statuses changed)
      if (status === 'Paid') {
         fetchPendingExpenses();
      }

      resetForm();
      
    } catch (error) {
      const serverMessage = error.response?.data?.message;
      errorToast(serverMessage || error.message || "Failed to save record");
    } finally {
      setPaying(false);
    }
  };

  const handleQuickPay = async (record) => {
    const recId = record._id || record.id;
    setUpdatingId(recId);
    
    try {
      const response = await axios.put(`/api/salary/update/${recId}`, {
        status: 'Paid',
        paidDate: new Date().toISOString()
      });

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      successToast("Salary marked as Paid");

      setSalaryRecords(prev => prev.map(r => 
        (r._id === recId || r.id === recId) 
          ? { ...r, status: 'Paid', paidDate: new Date().toISOString() } 
          : r
      ));
      
      // Refresh pending expenses
      fetchPendingExpenses();

    } catch (error) {
      console.error(error);
      errorToast(error.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;
    setDeleting(true);
    try {
      const response = await axios.delete(`/api/salary/delete/${recordToDelete._id || recordToDelete.id}`);
      if (!response.data.success) throw new Error(response.data.message);
      
      setSalaryRecords(prev => prev.filter(r => (r._id || r.id) !== (recordToDelete._id || recordToDelete.id)));
      successToast("Record deleted");
      setDeleteModalOpen(false);
    } catch (error) {
      errorToast(error.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  // --- Form Handlers ---

  const handleManualExpenseChange = (index, field, value) => {
    const newExpenses = [...formData.manualExpenses];
    newExpenses[index][field] = value;
    setFormData(prev => ({ ...prev, manualExpenses: newExpenses }));
  };

  const addExpenseRow = () => {
    setFormData(prev => ({
      ...prev,
      manualExpenses: [...prev.manualExpenses, { description: '', amount: '' }]
    }));
  };

  const removeExpenseRow = (index) => {
    setFormData(prev => ({
      ...prev,
      manualExpenses: prev.manualExpenses.filter((_, i) => i !== index)
    }));
  };

  // --- Utilities ---
  const formatCurrency = (amount) => 
    new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(amount || 0);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // --- CSV Export ---
  const handleExportSingle = (record) => {
    const rows = [
      ['SALARY SLIP', 'MIGCO.'],
      ['Employee', employee?.name],
      ['Period', `${formatDate(record.fromDate)} - ${formatDate(record.toDate)}`],
      ['Status', record.status],
      [],
      ['DESCRIPTION', 'AMOUNT'],
      ['Base Salary', record.baseSalary],
      ['Allowances', record.allowances],
      ['Absence Deduction', `-${record.absentDeduction || 0}`],
      ['DB Expenses', `-${record.dbExpensesTotal || 0}`],
      ['Other Deductions', `-${record.deductions || 0}`],
      ...(record.manualExpenses || []).map(e => [e.description, `-${e.amount}`]),
      [],
      ['NET SALARY', record.netSalary],
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Salary_${employee?.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = useMemo(() => {
    if (selectedStatus === 'All') return salaryRecords;
    return salaryRecords.filter(r => r.status === selectedStatus);
  }, [salaryRecords, selectedStatus]);


  if (loading) return <CustomLoader/>
  
  return (
    <div className="">
      
      {/* Delete Modal */}
      {deleteModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box rounded-lg">
            <h3 className="font-bold text-lg text-error flex items-center gap-2">
              <AlertCircle /> Confirm Deletion
            </h3>
            <p className="py-4">Are you sure you want to delete the salary record for <span className="font-bold">{recordToDelete?.month}</span>?</p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</button>
              <button className="btn btn-error text-white" onClick={handleDeleteRecord} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/20" onClick={() => setDeleteModalOpen(false)}></div>
        </dialog>
      )}

      {/* Header */}
      <DashboardPageHeader 
        breadData={[
          { name: "Dashboard", href: "/Dashboard" },
          { name: "Employees", href: "/Dashboard/Employees" },
          { name: employee?.name || "Employee", href: "#" },
        ]} 
        heading="Salary Management" 
      />

      <div className=" space-y-6 mt-10">

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stats shadow bg-base-100">
            <div className="stat">
                <div className="stat-title text-xs">Salary</div>
                <div className="stat-value text-2xl text-[var(--primary-color)]">
                {formatCurrency(employee?.salary)}
                </div>
                <div className="stat-desc ">Base Salary</div>
            </div>
            </div>

            <div className="stats shadow bg-base-100">
            <div className="stat">
                <div className="stat-title text-xs">Salary Records</div>
                <div className="stat-value text-2xl ">
                {salaryRecords.length}
                </div>
            </div>
            </div>

            <div className="stats shadow bg-base-100">
            <div className="stat">
                <div className="stat-title text-xs">Pending Liabilities</div>
                <div className="stat-value text-2xl text-error">
                {/* Sum of remaining balances */}
                {formatCurrency(pendingExpenses.reduce((sum, e) => sum + (e.amount - (e.paidAmount||0)), 0))}
                </div>
                <div className="stat-desc ">Total DB Expenses</div>
            </div>
            </div>

            <div className="stats shadow bg-base-100">
            <div className="stat">
                <div className="stat-title text-xs">Paid Salary</div>
                <div className="stat-value text-2xl text-success">
                {formatCurrency(salaryRecords.filter(r => r.status === 'Paid').reduce((a, b) => a + (b.netSalary || 0), 0))}
                </div>
                <div className="stat-desc ">Total Disbursed</div>
            </div>
            </div>
        </div>
        
        {/* Employee Identity Card */}
        <div className="bg-base-100 shadow-sm rounded-lg p-6 border border-base-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold">{employee?.name}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-70 mt-1">
                <span className="flex items-center gap-1"><Briefcase size={14}/> {employee?.role || 'N/A'}</span>
                <span className="flex items-center gap-1"><FileText size={14}/> Iqama: {employee?.iqamaNumber}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
             <button onClick={() => router.back()} className="btn btn-outline btn-sm">
                <ArrowLeft size={16} /> Back
             </button>
             <button 
                onClick={() => setShowCalculator(true)} 
                className={`btn btn-sm text-white border-none bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90 ${showCalculator ? 'btn-disabled' : ''}`}
             >
                <Plus size={16} /> Create Salary
             </button>
          </div>
        </div>

        {/* CALCULATOR SECTION */}
        {showCalculator && (
          <div className="card bg-base-100 shadow-lg border-t-4 border-[var(--primary-color)] animate-in fade-in slide-in-from-top-4">
            <div className="card-body p-6">
              <div className="flex justify-between items-center pb-4 border-b border-base-200 mb-4">
                <h3 className="card-title text-lg flex items-center gap-2">
                  <Calculator className="text-[var(--primary-color)]" size={20} /> New Salary Calculation
                </h3>
                <button onClick={resetForm} className="btn btn-ghost btn-sm btn-circle"><X size={20}/></button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Inputs Column */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* 1. Time Period */}
                  <div className="bg-base-200/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><Calendar size={16}/> Salary Period</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="form-control">
                        <label className="label text-xs opacity-70">Quick Select Month</label>
                        <input required type="month" className="input input-sm input-bordered " 
                          onChange={handleMonthSelect} value={formData.monthReference} />
                      </div>
                      <div className="form-control">
                        <label className="label text-xs opacity-70">From Date</label>
                        <input type="date" required className="input input-sm input-bordered "
                           value={formData.fromDate} onChange={e => setFormData({...formData, fromDate: e.target.value})} />
                      </div>
                      <div className="form-control">
                        <label className="label text-xs opacity-70">To Date</label>
                        <input type="date" required className="input input-sm input-bordered "
                           value={formData.toDate} onChange={e => setFormData({...formData, toDate: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 2. Earnings */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-success border-b pb-2">Earnings</h4>
                      <InputGroup label="Base Salary (SAR)" value={formData.baseSalary ?? 0} 
                        onChange={v => setFormData({...formData, baseSalary: v})} />
                      <InputGroup label="Overtime / Allowances" value={formData.allowances} 
                        onChange={v => setFormData({...formData, allowances: v})} />
                    </div>

                    {/* 3. Deductions */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-error border-b pb-2">Deductions</h4>
                      <div className="form-control">
                        <label className="label text-xs font-medium block pt-2">Absent Days</label>
                        <div className="join">
                          <input type="number" className="input input-sm input-bordered join-item w-full" 
                            value={formData.absentDays} onChange={e => setFormData({...formData, absentDays: e.target.value})} />
                          <div className="join-item btn btn-sm btn-disabled bg-base-200">Days</div>
                        </div>
                      </div>
                      <InputGroup label="Other Deductions" value={formData.deductions} 
                        onChange={v => setFormData({...formData, deductions: v})} />
                    </div>
                  </div>

                  {/* 4. DB EXPENSES TABLE - With Manual Inputs */}
                  <div className="bg-base-100 border border-base-200 rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Receipt size={16} className="text-warning"/> Pending Liabilities (Database)
                    </h4>
                    {pendingExpenses.length === 0 ? (
                         <p className="text-xs opacity-50 italic">No pending expenses found for this employee.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table table-xs">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Description</th>
                                        <th className="text-right">Total Owed</th>
                                        <th className="text-right w-32">Deduct Now</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingExpenses.map(exp => {
                                        const paid = exp.paidAmount || 0;
                                        const remaining = exp.amount - paid;
                                        return (
                                            <tr key={exp._id}>
                                                <td className="w-24">{new Date(exp.date).toLocaleDateString()}</td>
                                                <td>
                                                    <div className="font-medium">{exp.type}</div>
                                                    <div className="text-[10px] opacity-60 truncate max-w-[150px]">{exp.description}</div>
                                                </td>
                                                <td className="text-right opacity-60 font-medium">
                                                    {formatCurrency(remaining)}
                                                </td>
                                                <td className="text-right">
                                                    {/* INPUT FIELD FOR MANUAL ALLOCATION */}
                                                    <input 
                                                        type="number" 
                                                        className="input input-xs input-bordered w-full text-right font-bold text-error"
                                                        value={expenseAllocations[exp._id] ?? remaining}
                                                        onChange={(e) => handleAllocationChange(exp._id, e.target.value, remaining)}
                                                        min="0"
                                                        max={remaining}
                                                    />
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    <tr className="bg-base-200 font-bold">
                                        <td colSpan={3} className="text-right">Total Deducting:</td>
                                        <td className="text-right text-error">
                                            {formatCurrency(Object.values(expenseAllocations).reduce((sum, val) => sum + val, 0))}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                  </div>

                  {/* 5. Manual Extras */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-semibold">Ad-hoc Deductions (Manual)</label>
                      <button onClick={addExpenseRow} className="btn btn-xs btn-outline border-dashed">
                        <Plus size={14}/> Add Item
                      </button>
                    </div>
                    {formData.manualExpenses.length === 0 && <p className="text-xs opacity-50 italic">No additional manual items.</p>}
                    <div className="space-y-2">
                      {formData.manualExpenses.map((exp, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input type="text" placeholder="Description" className="input input-sm input-bordered flex-1"
                            value={exp.description} onChange={e => handleManualExpenseChange(idx, 'description', e.target.value)} />
                          <input type="number" placeholder="Amount" className="input input-sm input-bordered w-32"
                            value={exp.amount} onChange={e => handleManualExpenseChange(idx, 'amount', e.target.value)} />
                          <button onClick={() => removeExpenseRow(idx)} className="btn btn-sm btn-square btn-ghost text-error"><Trash2 size={16}/></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <textarea className="textarea textarea-bordered w-full" placeholder="Internal Notes..." 
                    value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
                </div>

                {/* Summary Column */}
                <div className="lg:col-span-4">
                  <div className="bg-base-200 rounded-lg p-5 sticky top-6">
                    <h4 className="font-bold  mb-4 text-sm uppercase tracking-wider">Estimated Breakdown</h4>
                    
                    {calculatedData && (
                      <div className="space-y-3 text-sm">
                        <SummaryRow label="Base Pay" amount={calculatedData.baseSalary} />
                        <SummaryRow label="Allowances" amount={calculatedData.extraAllowances} isAdd />
                        <div className="divider my-1"></div>
                        <SummaryRow label={`Absence (${formData.absentDays} days)`} amount={-calculatedData.absentDeduction} isDeduct />
                        <SummaryRow label="DB Expenses" amount={-calculatedData.dbExpensesTotal} isDeduct />
                        <SummaryRow label="Manual Expenses" amount={-calculatedData.manualExpensesTotal} isDeduct />
                        <SummaryRow label="Other Deductions" amount={-calculatedData.extraDeductions} isDeduct />
                        
                        <div className="bg-base-100 p-4 rounded-lg mt-4 border border-base-300">
                          <span className="block text-xs mb-1">Net Payable Salary</span>
                          <span className="block text-lg font-bold text-[var(--primary-color)]">{formatCurrency(calculatedData.netSalary)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-6">
                          <button 
                            onClick={() => handleSaveRecord('Pending')} 
                            disabled={paying}
                            className="btn btn-outline w-full rounded-sm"
                          >
                            <Save size={16} /> Save 
                          </button>
                          <button 
                            onClick={() => handleSaveRecord('Paid')} 
                            disabled={paying}
                            className="btn bg-[var(--primary-color)] text-white hover:bg-[var(--primary-color)]/90 border-none w-full rounded-sm"
                          >
                            <CheckCircle2 size={16} /> Pay Now
                          </button>
                        </div>
                      </div>
                    )}
                    {!calculatedData && <div className="text-center py-10 opacity-50">Enter details to see breakdown</div>}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* HISTORY TABLE */}
        <div className="card bg-base-100 shadow-sm md:p-4 p-2">
          <div className="card-body p-0">
            {/* Table Toolbar */}
            <div className="p-4 flex justify-between items-center gap-4">
              <div className=" hidden md:flex items-center gap-2">
                 <h3 className="font-bold text-lg">Salary History</h3>
                 <div className="badge badge-neutral">{filteredRecords.length}</div>
              </div>
              <div className="flex items-center gap-3 float-end w-full md:w-auto">
              <span>Status:</span>
                <CustomDropdown 
                  value={selectedStatus} 
                  setValue={setSelectedStatus} 
                  dropdownMenu={['All', 'Paid', 'Pending']} 
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table table-md">
                <thead className="bg-base-200/50 text-xs uppercase">
                  <tr>
                    <th>Period</th>
                    <th className="text-right">Earnings</th>
                    <th className="text-right">Deductions</th>
                    <th className="text-right">Net Pay</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-10 opacity-50">No salary records found.</td></tr>
                  ) : filteredRecords.map((record) => (
                    <tr key={record._id || record.id} className="hover:bg-base-100 group transition-colors">
                      <td>
                        <div className="font-bold">
                        {record?.month 
                            ? new Date(record.month).toLocaleString("en-US", { month: "long", year: "numeric" })
                            : "Unknown Period"
                        }
                        </div>
                        <div className="text-xs opacity-50">
                          {formatDate(record.fromDate)} - {formatDate(record.toDate)}
                        </div>
                      </td>
                      <td className="text-right font-medium text-success">
                        {formatCurrency(record.baseSalary + record.allowances)}
                      </td>
                      <td className="text-right font-medium text-error">
                        {formatCurrency(record.totalDeductions || (record.deductions + (record.dbExpensesTotal||0)))}
                      </td>
                      <td className="text-right">
                        <div className="font-bold text-[var(--primary-color)]">{formatCurrency(record.netSalary)}</div>
                      </td>
                      <td>
                        <span className={`badge badge-sm font-medium ${record.status === 'Paid' ? 'badge-success text-white' : 'badge-warning'}`}>
                          {record.status}
                        </span>
                        {record.status === 'Paid' && record.paidDate && (
                           <div className="text-[10px] opacity-60 mt-1">On: {formatDate(record.paidDate)}</div>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="join">
                          
                          {/* MARK AS PAID BUTTON */}
                          {record.status !== 'Paid' && (
                            <button 
                              onClick={() => handleQuickPay(record)} 
                              disabled={updatingId === (record._id || record.id)}
                              className="btn btn-sm btn-ghost join-item text-success tooltip tooltip-left" 
                              data-tip="Mark as Paid"
                            >
                              {updatingId === (record._id || record.id) ? (
                                <span className="loading loading-spinner loading-xs text-[var(--primary-color)]"></span>
                              ) : (
                                <DollarSign size={16} /> 
                              )}
                            </button>
                          )}

                          <button onClick={() => handleExportSingle(record)} className="btn btn-sm btn-ghost join-item tooltip" data-tip="Export CSV">
                            <Download size={16} className="text-base-content/70"/>
                          </button>
                          <button onClick={() => { setRecordToDelete(record); setDeleteModalOpen(true); }} className="btn btn-sm btn-ghost join-item text-error tooltip" data-tip="Delete">
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- Sub Components ---

const InputGroup = ({ label, value, onChange }) => (
  <div className="form-control">
    <label className="label text-xs font-medium">{label}</label>
    <input type="number" className="input input-sm input-bordered w-full" 
      value={value} onChange={(e) => onChange(e.target.value)} placeholder="0.00" />
  </div>
);

const SummaryRow = ({ label, amount, isDeduct, isAdd }) => (
  <div className="flex justify-between items-center">
    <span className="opacity-70">{label}</span>
    <span className={`font-semibold ${isDeduct ? 'text-error' : isAdd ? 'text-success' : ''}`}>
      {new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(amount || 0)}
    </span>
  </div>
);