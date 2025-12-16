'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Download, Plus, X, Save, Calculator, DollarSign, 
  Calendar, Trash2, ArrowLeft, Briefcase, 
  AlertCircle, CheckCircle2, FileText
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
    expenses: [], 
    deductions: '0', 
    allowances: '0', 
    notes: '',
    status: "Pending",
    employeeId: '' // Initialize as empty, filled via useEffect
  });

  const [calculatedData, setCalculatedData] = useState(null);

  // --- API Functions ---

  // Defined with useCallback to prevent infinite loops in dependency arrays
  const fetchEmployeeData = useCallback(async () => {
    try {
      const response = await axios.get(`/api/employee/getEmployee/${employeeId}`);
      if (!response.data.success) {
        throw new Error(response.data.message);
      }
      const emp = response.data.employee;
      setEmployee(emp);
      
      // Initialize form with employee ID immediately upon fetch
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
      Promise.all([fetchEmployeeData(), fetchSalaryRecords()])
        .finally(() => setLoading(false));
    }
  }, [employeeId, fetchEmployeeData, fetchSalaryRecords]);

  // --- Logic & Calculations ---

  const handleMonthSelect = (e) => {
    const date = new Date(e.target.value);
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Create dates in local time
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

  const handleCalculate = useCallback(() => {
    const { fromDate, toDate, baseSalary, absentDays, expenses, deductions, allowances } = formData;
    
    if (!fromDate || !toDate) return;

    const base = parseFloat(baseSalary) || 0;
    const absent = parseFloat(absentDays) || 0;
    const extraDeduct = parseFloat(deductions) || 0;
    const extraAllow = parseFloat(allowances) || 0;

    const dailyRate = base / 30; 
    const absentDeduction = dailyRate * absent;
    
    const expensesTotal = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    const totalDeductions = absentDeduction + expensesTotal + extraDeduct;
    
    const netSalary = (base + extraAllow) - totalDeductions;

    setCalculatedData({
      ...formData,
      baseSalary: base,
      absentDays: absent,
      absentDeduction,
      expensesTotal,
      extraDeductions: extraDeduct,
      extraAllowances: extraAllow,
      totalDeductions,
      netSalary: Math.max(0, netSalary)
    });
  }, [formData]);

  // Auto-calculate trigger
  useEffect(() => {
    if(formData.fromDate && formData.toDate) {
      handleCalculate();
    }
  }, [handleCalculate, formData.fromDate, formData.toDate]); // Dependencies simplified as handleCalculate depends on formData


  // --- Database Actions ---

  // *** CRITICAL FIX: Reset Form with Employee ID preserved ***
  const resetForm = () => {
    setFormData({
      monthReference: '',
      fromDate: '',
      toDate: '',
      baseSalary: employee?.salary || '', 
      employeeId: employee?._id || employeeId, // ENSURE ID IS KEPT
      absentDays: '0',
      expenses: [],
      deductions: '0',
      allowances: '0',
      notes: '',
      status: "Pending"
    });
    setCalculatedData(null);
    setShowCalculator(false);
  };

  const handleSaveRecord = async (status = 'Pending') => {
    if (!calculatedData) {
      errorToast("Please fill in the date range first");
      return;
    }

    // Safety check: Ensure employeeId is present in the payload
    const finalPayload = { 
        ...calculatedData, 
        employeeId: calculatedData.employeeId || employee?._id || employeeId,
        status, 
        paidDate: status === 'Paid' ? new Date() : null 
    };

    try {
      setPaying(true);
      
      const response = await axios.post("/api/salary/add", finalPayload);

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      successToast(status === 'Paid' ? "Salary processed & paid successfully" : "Draft saved successfully");

      setSalaryRecords(prev => [response.data.data, ...prev]);

      // Successfully saved, now reset for next entry
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

  const handleExpenseChange = (index, field, value) => {
    const newExpenses = [...formData.expenses];
    newExpenses[index][field] = value;
    setFormData(prev => ({ ...prev, expenses: newExpenses }));
  };

  const addExpenseRow = () => {
    setFormData(prev => ({
      ...prev,
      expenses: [...prev.expenses, { description: '', amount: '' }]
    }));
  };

  const removeExpenseRow = (index) => {
    setFormData(prev => ({
      ...prev,
      expenses: prev.expenses.filter((_, i) => i !== index)
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
  const downloadCSV = (data, filename) => {
    const csvContent = "data:text/csv;charset=utf-8," + data.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSingle = (record) => {
    const rows = [
      ['SALARY SLIP', 'MIGCO.'],
      ['Employee', employee?.name],
      ['Period', `${formatDate(record.fromDate)} - ${formatDate(record.toDate)}`],
      ['Paid On', record.paidDate ? formatDate(record.paidDate) : 'N/A'],
      ['Status', record.status],
      [],
      ['DESCRIPTION', 'AMOUNT'],
      ['Base Salary', record.baseSalary],
      ['Allowances', record.allowances],
      ['Absence Deduction', `-${record.absentDeduction || 0}`],
      ['Other Deductions', `-${record.deductions || 0}`],
      ...(record.expenses || []).map(e => [e.description, `-${e.amount}`]),
      [],
      ['NET SALARY', record.netSalary],
      ['Notes', record.notes || 'N/A']
    ];
    downloadCSV(rows, `Salary_${employee?.name}_${record.month}.csv`);
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
                <div className="stat-title text-xs">Salary</div>
                <div className="stat-value text-2xl ">
                {salaryRecords.length}
                </div>
                <div className="stat-desc ">Salary record</div>
            </div>
            </div>

            <div className="stats shadow bg-base-100">
            <div className="stat">
                <div className="stat-title text-xs">Paid</div>
                <div className="stat-value text-2xl text-success">
                {formatCurrency(salaryRecords.filter(r => r.status === 'Paid').reduce((a, b) => a + (b.netSalary || 0), 0))}
                </div>
                <div className="stat-desc ">Total Paid</div>
            </div>
            </div>

            <div className="stats shadow bg-base-100">
            <div className="stat">
                <div className="stat-title text-xs">Remaining</div>
                <div className="stat-value text-2xl text-warning">
                {formatCurrency(salaryRecords.filter(r => r.status !== 'Paid').reduce((a, b) => a + (b.netSalary || 0), 0))}
                </div>
                <div className="stat-desc ">Total Remaining </div>
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

                  {/* 4. Expenses Dynamic List */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-semibold">Expenses & Loans</label>
                      <button onClick={addExpenseRow} className="btn btn-xs btn-outline border-dashed">
                        <Plus size={14}/> Add Item
                      </button>
                    </div>
                    {formData.expenses.length === 0 && <p className="text-xs opacity-50 italic">No additional expenses added.</p>}
                    <div className="space-y-2">
                      {formData.expenses.map((exp, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input type="text" placeholder="Description (e.g., Food Advance)" className="input input-sm input-bordered flex-1"
                            value={exp.description} onChange={e => handleExpenseChange(idx, 'description', e.target.value)} />
                          <input type="number" placeholder="Amount" className="input input-sm input-bordered w-32"
                            value={exp.amount} onChange={e => handleExpenseChange(idx, 'amount', e.target.value)} />
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
                        <SummaryRow label="Expenses Total" amount={-calculatedData.expensesTotal} isDeduct />
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
                        {formatCurrency(record.totalDeductions || (record.deductions + (record.expenses?.reduce((a,b)=>a+b.amount,0)||0)))}
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