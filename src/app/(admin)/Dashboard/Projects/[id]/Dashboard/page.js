'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios'; 
import { 
  ArrowLeft, Plus, Trash2, DollarSign, TrendingUp, 
  AlertCircle, Loader, BarChart3, Search, LayoutGrid, Wallet, Receipt,
  X, AlertTriangle, 
  Loader2
} from 'lucide-react';
import DashboardPageHeader from '@/Components/DashboardPageHeader';
import CustomLoader from '@/Components/CustomLoader';
import { errorToast, successToast } from '@/lib/toast';

// --- 1. LOCAL SUB-COMPONENTS ---

// *** Custom Delete Modal Component ***
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, isDeleting, type }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-base-100 rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose} 
          disabled={isDeleting}
          className="absolute right-4 top-4   -400 hover:  -600 transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mb-4 text-error">
            <AlertTriangle size={24} />
          </div>
          
          <h3 className="text-lg font-bold   -800 mb-2">
            Delete {type === 'expense' ? 'Expense' : 'Income'}?
          </h3>
          
          <p className="  text-sm mb-6">
            Are you sure you want to delete this record? This action cannot be undone and will affect your project totals.
          </p>
          
          <div className="flex gap-3 w-full">
            <button 
              onClick={onClose}
              disabled={isDeleting}
              className="btn btn-sm flex-1     -700 border-none"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              disabled={isDeleting}
              className="btn btn-sm flex-1 btn-error text-white"
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : 'Delete Record'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardSearch = ({ placeholder, value, onChange }) => (
  <div className="relative w-full md:w-64">
    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2   -400" />
    <input 
      type="text" 
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full pl-10 pr-4 py-2 border text-sm border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral bg-base-200"
    />
  </div>
);

const TransactionTable = ({ data, type, onDelete, total }) => {
  const isExpense = type === 'expense';
  const colorClass = isExpense ? 'text-error' : 'text-success';
  const EmptyIcon = isExpense ? DollarSign : TrendingUp;
  const title = isExpense ? 'Expense History' : 'Income History';

  return (
    <div className="bg-base-100 rounded-xl shadow-sm border border-base-200 overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-base-200 flex justify-between items-center bg-base-50/50">
        <h3 className="font-semibold   -700">{title}</h3>
        <span className="text-xs   -500 font-medium bg-base-200 px-2 py-1 rounded-full">{data.length} records</span>
      </div>
      
      <div className="overflow-x-auto flex-1">
        <table className="table table-zebra w-full whitespace-nowrap">
          <thead className="bg-base-100   -500">
            <tr>
              <th className="w-32">Date</th>
              <th>Description</th>
              <th className="text-right">Amount (SAR)</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item._id || item.id} className="hover:bg-base-200/50 transition-colors group">
                <td className="font-medium text-xs   -500">{new Date(item.date).toLocaleDateString()}</td>
                <td className="whitespace-normal min-w-[180px] font-medium   -700">{item.description}</td>
                <td className={`text-right font-bold ${colorClass}`}>
                  SAR {item.amount.toLocaleString()}
                </td>
                <td>
                  <button onClick={() => onDelete(item._id || item.id)} className="btn btn-ghost btn-xs text-error hover:text-error transition-opacity">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length > 0 && (
        <div className="p-4 border-t border-base-200 bg-base-50/50 flex justify-between items-center">
          <span className="text-sm font-medium   -500">Total {isExpense ? 'Spent' : 'Earned'}</span>
          <span className={`text-xl font-bold ${colorClass}`}>SAR {total.toLocaleString()}</span>
        </div>
      )}

      {data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center flex-1">
          <div className="bg-base-200 p-4 rounded-full mb-3">
            <EmptyIcon size={24} className="  -400" />
          </div>
          <p className="  -500 font-medium">No records found</p>
        </div>
      )}
    </div>
  );
};

const ActivityTable = ({ transactions }) => (
  <div className="bg-base-100 rounded-xl shadow-sm border border-base-200 overflow-hidden">
    <div className="overflow-x-auto">
        <h3 className="font-semibold pt-4 pl-4 pb-2 ">Recent Activity</h3>
      <table className="table table-zebra w-full whitespace-nowrap">
        <thead className="  -500">
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Type</th>
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((item, index) => {
            const isExp = item.type === 'expense';
            return (
              <tr key={index}>
                <td className="text-xs font-medium   -500">{new Date(item.date).toLocaleDateString()}</td>
                <td className="whitespace-normal min-w-[200px]   -700">{item.description}</td>
                <td>
                  <span className={`badge badge-sm font-medium ${isExp ? 'badge-error badge-outline' : 'badge-success badge-outline'}`}>
                    {isExp ? 'Expense' : 'Income'}
                  </span>
                </td>
                <td className={`text-right font-bold ${isExp ? 'text-error' : 'text-success'}`}>
                  {isExp ? '-' : '+'}SAR {item.amount.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    {transactions.length === 0 && <div className="p-8 text-center   -500">No recent activity</div>}
  </div>
);


// --- 2. MAIN PAGE COMPONENT ---

export default  function   ProjectDashboardPage () {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const projectId =  params?.id;
  const currentViewParam = searchParams.get('view') || 'overview';
  const activeTab = currentViewParam.charAt(0).toUpperCase() + currentViewParam.slice(1);

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Forms
  const [expenseForm, setExpenseForm] = useState({ date: new Date().toISOString().split('T')[0], description: '', amount: '' });
  const [incomeForm, setIncomeForm] = useState({ date: new Date().toISOString().split('T')[0], description: '', amount: '' });
  
  // Validation States
  const [expenseErrors, setExpenseErrors] = useState({});
  const [incomeErrors, setIncomeErrors] = useState({});

  // Adding States
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isAddingIncome, setIsAddingIncome] = useState(false);

  // Delete State
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, type: null }); // type: 'expense' | 'income'
  const [isDeleting, setIsDeleting] = useState(false);

  // --- API FUNCTIONS ---

  // 1. Fetch Project Data
  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const response = await axios.get(`/api/project/${projectId}/get`);
      const success = response.data.success;
      if (!success) {
        errorToast(response.data.message || "Something went wrong");
        setLoading(false);
        router.back();
        return;
      }
      setProject(response.data.project);

    } catch (error) {
      console.error("Error fetching project:", error);
      errorToast("Failed to load project data");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Validation Helpers
  const validateExpense = () => {
    const errors = {};
    if (!expenseForm.date) errors.date = "Date is required";
    if (!expenseForm.description.trim()) errors.description = "Description is required";
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) errors.amount = "Valid amount is required";
    
    setExpenseErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateIncome = () => {
    const errors = {};
    if (!incomeForm.date) errors.date = "Date is required";
    if (!incomeForm.description.trim()) errors.description = "Description is required";
    if (!incomeForm.amount || parseFloat(incomeForm.amount) <= 0) errors.amount = "Valid amount is required";
    
    setIncomeErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 2. Add Expense
  const handleAddExpense = async () => {
    if (!validateExpense()) return;
    
    setIsAddingExpense(true); 
    try {
      const response = await axios.post(`/api/project/${projectId}/expenses`, {
        date: expenseForm.date,
        description: expenseForm.description.trim(),
        amount: parseFloat(expenseForm.amount)
      });

      const success= response.data.success
      if(!success)
      {
        errorToast(response.data.message || "Something went wrong")
        setIsAddingExpense(false); 
        return;
      }

      successToast(response.data.message || "Expense add successfully");
      setProject(response.data.data);
      setExpenseForm({ date: new Date().toISOString().split('T')[0], description: '', amount: '' });
      setExpenseErrors({});
    } catch (error) {
      console.error("Error adding expense:", error);
      alert("Failed to add expense. Please try again.");
    } finally {
      setIsAddingExpense(false); 
    }
  };

  // 3. Add Income
  const handleAddIncome = async () => {
    if (!validateIncome()) return;
    
    setIsAddingIncome(true); 
    try {
      const response = await axios.post(`/api/project/${projectId}/incomes`, {
        date: incomeForm.date,
        description: incomeForm.description.trim(),
        amount: parseFloat(incomeForm.amount)
      });
      const success= response.data.success
      if(!success)
      {
        errorToast(response.data.message || "Something went wrong")
        setIsAddingIncome(false); 
        return;
      }

      successToast(response.data.message || "Income added successfully");
      setProject(response.data.data);
      setIncomeForm({ date: new Date().toISOString().split('T')[0], description: '', amount: '' });
      setIncomeErrors({});
    } catch (error) {
      console.error("Error adding income:", error);
      alert("Failed to add income.");
    } finally {
      setIsAddingIncome(false);
    }
  };

  // --- DELETE HANDLERS ---

  const initiateDelete = (id, type) => {
    setDeleteModal({ isOpen: true, id, type });
  };

  const executeDelete = async () => {
    if (!deleteModal.id || !deleteModal.type) return;

    setIsDeleting(true);
    try {
      let response;
      if (deleteModal.type === 'expense') {
         response = await axios.delete(`/api/project/${projectId}/expenses/${deleteModal.id}`);
      } else {
         response = await axios.delete(`/api/project/${projectId}/incomes/${deleteModal.id}`);
      }
      const success = response.data.success

       
      if(!success)
      {
        errorToast(response.data.message || "something went wrong")
         setIsDeleting(false);
        return
      }
      successToast(response.data.message || "record deleted successfully ")
      setProject(response.data.data); 
      setDeleteModal({ isOpen: false, id: null, type: null }); 
    } catch (error) {
      console.error(`Error deleting ${deleteModal.type}:`, error);
      alert(`Failed to delete ${deleteModal.type}.`);
    } finally {
      setIsDeleting(false);
    }
  };


  // --- CALCULATION & HELPERS ---

  const handleTabChange = (tabName) => {
    const params = new URLSearchParams(searchParams);
    if (tabName) params.set('view', tabName.toLowerCase());
    else params.delete('view');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const calculateTotals = () => {
    if (!project) return { totalExpenses: 0, totalIncome: 0, balance: 0 };
    const totalExpenses = project.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
    const totalIncome = project.income?.reduce((sum, i) => sum + i.amount, 0) || 0;
    return { totalExpenses, totalIncome, balance: totalIncome - totalExpenses };
  };

  const getFilteredExpenses = () => {
    let filtered = project?.expenses || [];
    if (searchTerm) filtered = filtered.filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getFilteredIncome = () => {
    let filtered = project?.income || [];
    if (searchTerm) filtered = filtered.filter(i => i.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getActivityData = () => {
    const exps = (project?.expenses || []).map(e => ({ ...e, type: 'expense' }));
    const incs = (project?.income || []).map(i => ({ ...i, type: 'income' }));
    return [...exps, ...incs].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(a.date);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(b.date);
      return dateB - dateA;
    }).slice(0, 10);
  };

  const breadData = [
    { name: "Dashboard", href: "/Dashboard" },
    { name: "Projects", href: "/Dashboard/Projects" },
    { name: project?.name || "Project Details", href: "#" },
  ];

  if (loading) return <CustomLoader text={"Loading project dashboard..."}/>

  if (!project) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <AlertCircle size={64} className="text-error mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Project Not Found</h2>
        <button onClick={() => router.push('/Dashboard/Projects')} className="btn btn-sm bg-[var(--primary-color)] text-white"><ArrowLeft className="w-4 h-4 mr-1" />Back to Projects</button>
      </div>
    </div>
  );

  const totals = calculateTotals();
  const budgetUtilization = project.estimatedBudget ? (totals.totalExpenses / project.estimatedBudget) * 100 : 0;
  const tabs = [{ name: 'Overview', icon: LayoutGrid }, { name: 'Expenses', icon: Receipt }, { name: 'Income', icon: Wallet }];

  return (
    <>
      {/* --- MOUNT MODAL HERE --- */}
      <DeleteConfirmationModal 
        isOpen={deleteModal.isOpen} 
        onClose={() => setDeleteModal({ isOpen: false, id: null, type: null })}
        onConfirm={executeDelete}
        isDeleting={isDeleting}
        type={deleteModal.type}
      />

      <DashboardPageHeader breadData={breadData} heading={project.name} />

      {/* --- STATS SECTION --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 mt-10">
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-title text-xs font-medium uppercase tracking-wider   -500"> Expenses</div>
            <div className="stat-value text-2xl text-error mt-1">SAR {totals.totalExpenses.toLocaleString()}</div>
            <div className='stat-desc text-xs '> Total Expenses</div>
          </div>
        </div>
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-title text-xs font-medium uppercase tracking-wider   -500">Income</div>
            <div className="stat-value text-2xl text-success mt-1">SAR {totals.totalIncome.toLocaleString()}</div>
             <div className='stat-desc text-xs '> Total Income</div>
          </div>
        </div>
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-title text-xs font-medium uppercase tracking-wider   -500">Profit / Loss</div>
            <div className={`stat-value text-2xl mt-1 ${totals.balance >= 0 ? 'text-[var(--primary-color)]' : 'text-warning'}`}>
              {totals.balance >= 0 ? '+' : ''}SAR {totals.balance.toLocaleString()}
            </div>
             <div className='stat-desc text-xs '>Net Profit / Loss</div>
          </div>
        </div>
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-title text-xs font-medium uppercase tracking-wider   -500">Budget Used</div>
            <div className="stat-value text-2xl text-[var(--primary-color)] mt-1">{budgetUtilization.toFixed(0)}%</div>
            <progress className="progress progress-primary w-full mt-2" value={project.progress} max="100"></progress>
          </div>
        </div>
      </div>

      {/* --- CONTROLS SECTION --- */}
      <div className="w-full bg-base-100 rounded-xl shadow-sm border border-base-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="bg-base-200 p-1 rounded-lg flex items-center self-start md:self-auto w-full md:w-auto overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.name}
                  onClick={() => handleTabChange(tab.name)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-md text-xs md:text-sm cursor-pointer font-medium transition-all duration-200 whitespace-nowrap flex-1 md:flex-none justify-center
                    ${activeTab === tab.name 
                      ? 'bg-white text-[var(--primary-color)] shadow-sm' 
                      : '  -500 hover:  -700 hover:bg-base-300'
                    }
                  `}
                >
                  <Icon size={16} />
                  {tab.name}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <DashboardSearch 
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={setSearchTerm}
            />
            <Link href={`/Dashboard/Projects/${projectId}/Summary`} className="w-full sm:w-auto">
              <button className="btn  cursor-pointer btn-sm bg-[var(--primary-color)] text-white rounded-lg border-none w-full shadow-sm hover:brightness-110">
                <BarChart3 className="w-4 h-4 mr-1" />
                Report
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-base-100 p-4 rounded-xl shadow-sm border border-base-200">
              <h3 className="font-semibold mb-6 text-md ">Project Details</h3>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-base-200 pb-2"><span className="text-xs   -500 uppercase font-medium">Name</span><span className="font-medium text-sm">{project.name}</span></div>
                <div className="flex justify-between border-b border-base-200 pb-2"><span className="text-xs   -500 uppercase font-medium">Client</span><span className="font-medium text-sm">{project.clientName}</span></div>
                <div className="flex justify-between border-b border-base-200 pb-2"><span className="text-xs   -500 uppercase font-medium">Location</span><span className="font-medium text-sm">{project.location}</span></div>
                <div className="flex justify-between border-b border-base-200 pb-2"><span className="text-xs   -500 uppercase font-medium">Start Date</span><span className="font-medium text-sm">{new Date(project.startDate).toLocaleDateString()}</span></div>
                <div className="flex justify-between pt-2"><span className="text-xs   -500 uppercase font-medium">Budget</span><span className="font-bold text-sm text-[var(--primary-color)]">SAR {project.estimatedBudget?.toLocaleString()}</span></div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            <ActivityTable transactions={getActivityData()} />
          </div>
        </div>
      )}

      {activeTab === 'Expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 items-start">
          <div className="lg:col-span-1">
            <div className="bg-base-100 rounded-xl shadow-sm border border-base-200 p-5 sticky top-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-error/10 rounded-md"><Plus size={16} className="text-error" /></div>
                Add Expense
              </h3>
              <div className="space-y-4">
                <div className="w-full">
                  <label className="label pt-0"><span className="label-text text-xs font-medium">Date</span></label>
                  <input 
                    type="date" 
                    className={`input input-sm input-bordered w-full ${expenseErrors.date ? 'input-error' : ''}`}
                    value={expenseForm.date} 
                    onChange={(e) => {
                      setExpenseForm({...expenseForm, date: e.target.value});
                      if(expenseErrors.date) setExpenseErrors({...expenseErrors, date: ''});
                    }} 
                  />
                  {expenseErrors.date && <span className="text-error text-xs mt-1 block">{expenseErrors.date}</span>}
                </div>
                
                <div className="w-full">
                  <label className="label pt-0"><span className="label-text text-xs font-medium">Description</span></label>
                  <input 
                    type="text" 
                    placeholder="e.g., Cement bags" 
                    className={`input input-sm input-bordered w-full ${expenseErrors.description ? 'input-error' : ''}`}
                    value={expenseForm.description} 
                    onChange={(e) => {
                      setExpenseForm({...expenseForm, description: e.target.value});
                      if(expenseErrors.description) setExpenseErrors({...expenseErrors, description: ''});
                    }} 
                  />
                  {expenseErrors.description && <span className="text-error text-xs mt-1 block">{expenseErrors.description}</span>}
                </div>
                
                <div className="w-full">
                  <label className="label pt-0"><span className="label-text text-xs font-medium">Amount (SAR)</span></label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    min="0" 
                    className={`input input-sm input-bordered w-full font-mono ${expenseErrors.amount ? 'input-error' : ''}`}
                    value={expenseForm.amount} 
                    onChange={(e) => {
                      setExpenseForm({...expenseForm, amount: e.target.value});
                      if(expenseErrors.amount) setExpenseErrors({...expenseErrors, amount: ''});
                    }} 
                  />
                  {expenseErrors.amount && <span className="text-error text-xs mt-1 block">{expenseErrors.amount}</span>}
                </div>

                <button 
                  onClick={handleAddExpense} 
                  disabled={isAddingExpense}
                  className="btn btn-sm bg-error text-white w-full hover:bg-error/90 mt-2 shadow-sm flex items-center justify-center gap-2"
                >
                  {isAddingExpense ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Expense'
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 h-full">
            <TransactionTable 
                data={getFilteredExpenses()} 
                type="expense" 
                onDelete={(id) => initiateDelete(id, 'expense')} 
                total={totals.totalExpenses} 
            />
          </div>
        </div>
      )}

      {activeTab === 'Income' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 items-start">
          <div className="lg:col-span-1">
            <div className="bg-base-100 rounded-xl shadow-sm border border-base-200 p-5 sticky top-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-success/10 rounded-md"><Plus size={16} className="text-success" /></div>
                Record Income
              </h3>
              <div className="space-y-4">
                <div className="w-full">
                  <label className="label pt-0"><span className="label-text text-xs font-medium">Date</span></label>
                  <input 
                    type="date" 
                    className={`input input-sm input-bordered w-full ${incomeErrors.date ? 'input-error' : ''}`}
                    value={incomeForm.date} 
                    onChange={(e) => {
                      setIncomeForm({...incomeForm, date: e.target.value});
                      if(incomeErrors.date) setIncomeErrors({...incomeErrors, date: ''});
                    }} 
                  />
                  {incomeErrors.date && <span className="text-error text-xs mt-1 block">{incomeErrors.date}</span>}
                </div>
                
                <div className="w-full">
                  <label className="label pt-0"><span className="label-text text-xs font-medium">Description</span></label>
                  <input 
                    type="text" 
                    placeholder="e.g., Client payment" 
                    className={`input input-sm input-bordered w-full ${incomeErrors.description ? 'input-error' : ''}`}
                    value={incomeForm.description} 
                    onChange={(e) => {
                      setIncomeForm({...incomeForm, description: e.target.value});
                      if(incomeErrors.description) setIncomeErrors({...incomeErrors, description: ''});
                    }} 
                  />
                  {incomeErrors.description && <span className="text-error text-xs mt-1 block">{incomeErrors.description}</span>}
                </div>
                
                <div className="w-full">
                  <label className="label pt-0"><span className="label-text text-xs font-medium">Amount (SAR)</span></label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    min="0" 
                    className={`input input-sm input-bordered w-full font-mono ${incomeErrors.amount ? 'input-error' : ''}`}
                    value={incomeForm.amount} 
                    onChange={(e) => {
                      setIncomeForm({...incomeForm, amount: e.target.value});
                      if(incomeErrors.amount) setIncomeErrors({...incomeErrors, amount: ''});
                    }} 
                  />
                  {incomeErrors.amount && <span className="text-error text-xs mt-1 block">{incomeErrors.amount}</span>}
                </div>

                <button 
                  onClick={handleAddIncome} 
                  disabled={isAddingIncome}
                  className="btn btn-sm bg-success text-white w-full hover:bg-success/90 mt-2 shadow-sm flex items-center justify-center gap-2"
                >
                   {isAddingIncome ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Income'
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 h-full">
            <TransactionTable 
                data={getFilteredIncome()} 
                type="income" 
                onDelete={(id) => initiateDelete(id, 'income')} 
                total={totals.totalIncome} 
            />
          </div>
        </div>
      )}
    </>
  );
}