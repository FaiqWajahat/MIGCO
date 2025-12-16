'use client';
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Download,
  User,
  Loader2,
  AlertCircle,
  ArrowBigLeft,
  ArrowLeft
} from "lucide-react";
import DashboardPageHeader from "@/Components/DashboardPageHeader";
import CustomDropdown from "@/Components/CustomDropdown";
import { warningToast } from "@/lib/toast";
import CustomLoader from "@/Components/CustomLoader";
import Avatar from "@/Components/Avatar";



export default function EmployeeTrackingPage() {

  const router = useRouter();
  // 1. Get ID from URL Parameters
  const params = useParams();
  const { id } = params; // This is the MongoDB _id

  // Data States
  const [employee, setEmployee] = useState(null);
  const [trackingData, setTrackingData] = useState([]);
  
  // UI States
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  
  // Date States
  const todayISO = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(thirtyDaysAgo);
  const [toDate, setToDate] = useState(todayISO);

  // --- 1. Fetch Employee on Mount ---
  useEffect(() => {
    const fetchEmployeeDetails = async () => {
      if (!id) return;
      setIsLoadingEmployee(true);
      try {
        const response = await axios.get(`/api/employee/getEmployee/${id}`);
        if (response.data.success) {
          setEmployee(response.data.employee);
        }
      } catch (error) {
        console.error("Error fetching employee:", error);
      } finally {
        setIsLoadingEmployee(false);
      }
    };

    fetchEmployeeDetails();
  }, [id]);

  // --- 2. Fetch Tracking Data ---
  const handleSearch = async () => {
    if (!fromDate || !toDate) {
      warningToast("Please select both From and To dates");
      return;
    }
    if (new Date(fromDate) > new Date(toDate)) {
      warningToast("From date cannot be after To date");
      return;
    }
    
    setHasSearched(true);
    setIsLoadingData(true);
    
    try {
      const response = await axios.get("/api/attendance/tracking", {
        params: {
          employeeId: id,
          from: fromDate,
          to: toDate
        }
      });

      if (response.data.success) {
        setTrackingData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching tracking data:", error);
      setTrackingData([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  // --- 3. Filtering Logic (Client Side) ---
  const filteredData = useMemo(() => {
    return trackingData.filter((record) => {
      const matchesStatus = filterStatus === "All" || record.status === filterStatus;
      
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        searchQuery === "" ||
        record.date.includes(searchQuery) ||
        (record.projectName && record.projectName.toLowerCase().includes(searchLower));
        
      return matchesStatus && matchesSearch;
    });
  }, [trackingData, filterStatus, searchQuery]);

  // --- 4. Statistics ---
  const stats = useMemo(() => ({
    total: trackingData.length,
    present: trackingData.filter((r) => r.status === "Present").length,
    absent: trackingData.filter((r) => r.status === "Absent").length,
    leave: trackingData.filter((r) => r.status === "Leave").length,
  }), [trackingData]);

  const attendancePercentage = stats.total > 0 
    ? Math.round((stats.present / stats.total) * 100) 
    : 0;

  // --- 5. Export Handler ---
  const handleExport = () => {
    const csvContent = [
      ["Date", "Status", "Project", "Iqama"],
      ...filteredData.map(r => [
        new Date(r.date).toLocaleDateString(), 
        r.status, 
        r.projectName || "N/A",
        employee?.iqama || employee?.iqamaNumber || ""
      ])
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${employee?.name || "Employee"}_attendance.csv`;
    a.click();
  };

  const breadData = [
    { name: "Dashboard", href: "/Dashboard" },
    { name: "Employees", href: "/Dashboard/Employees" },
    { name: "Tracking", href: "#" },
  ];

  if (isLoadingEmployee) {
    return (
      <CustomLoader text={'loading employee field tracking...'}/>
    );
  }

  if (!employee) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <AlertCircle className="w-12 h-12 text-error" />
        <h2 className="text-xl font-bold">Employee Not Found</h2>
      </div>
    );
  }

  return (
    <> 
    <DashboardPageHeader breadData={breadData} heading="Employee Tracking" />
    <div className="w-full min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Employee Profile Card */}
        <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-6">
          <div className="flex items-center gap-4">
            <div className="avatar">
                                     <Avatar name={employee.name} size='lg'/>
                                   </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-base-content">{employee.name}</h2>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-base-content/70">
                {employee.position && (
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{employee.position}</span>
                    </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Iqama:</span>
                  <span className="font-mono">{employee.iqama || employee.iqamaNumber || "N/A"}</span>
                </div>
                {employee.department && (
                    <div className="flex items-center gap-2">
                    <span className="font-semibold">Department:</span>
                    <span>{employee.department}</span>
                    </div>
                )}
              </div>
            </div>
            <button
              onClick={() => router.push("/Dashboard/Employees")}
              className="btn btn-sm btn-outline  flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back 
              </button>
          </div>
        </div>

        {/* Filters & Search Control Bar */}
        <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between">
            <div className="flex flex-wrap items-end gap-3 w-full lg:w-auto">
              <div className="flex flex-col gap-1 flex-1 sm:flex-none">
                <label className="font-medium text-xs text-base-content/80">From Date</label>
                <input 
                  type="date" 
                  value={fromDate} 
                  onChange={(e) => setFromDate(e.target.value)} 
                  max={toDate} 
                  className="px-3 py-2 border border-base-300 rounded-lg text-xs bg-base-100 w-full"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1 sm:flex-none">
                <label className="font-medium text-xs text-base-content/80">To Date</label>
                <input 
                  type="date" 
                  value={toDate} 
                  onChange={(e) => setToDate(e.target.value)} 
                  min={fromDate} 
                  max={todayISO} 
                  className="px-3 py-2 border border-base-300 rounded-lg text-xs bg-base-100 w-full"
                />
              </div>
              <button 
                onClick={handleSearch} 
                disabled={isLoadingData}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-[var(--primary-color)] text-white rounded-sm cursor-pointer hover:opacity-90 transition font-medium text-xs h-[34px]"
              >
                {isLoadingData ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4" />}
                {isLoadingData ? "Searching..." : "Search Records"}
              </button>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto justify-center md:justify-end ">
              <label className="text-xs font-medium text-base-content/80 whitespace-nowrap ">Status:</label>
              <CustomDropdown
                value={filterStatus}
                setValue={setFilterStatus}
                dropdownMenu={["All", "Present", "Absent", "Leave"]}
              />
            </div>
          </div>
        </div>

        {/* Results Area */}
        {hasSearched && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
                <div className="text-xs text-base-content/60 uppercase font-medium mb-2">Total Days</div>
                <div className="text-3xl font-bold text-base-content">{stats.total}</div>
                <div className="text-xs mt-1 text-base-content/60">In selected range</div>
              </div>
              <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
                <div className="text-xs text-base-content/60 uppercase font-medium mb-2">Present</div>
                <div className="text-3xl font-bold text-success">{stats.present}</div>
                <div className="text-xs mt-1 text-success">Days present</div>
              </div>
              <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
                <div className="text-xs text-base-content/60 uppercase font-medium mb-2">Absent</div>
                <div className="text-3xl font-bold text-error">{stats.absent}</div>
                <div className="text-xs mt-1 text-error">Days absent</div>
              </div>
              <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
                <div className="text-xs text-base-content/60 uppercase font-medium mb-2">Leave</div>
                <div className="text-3xl font-bold text-warning">{stats.leave}</div>
                <div className="text-xs mt-1 text-warning">Days on leave</div>
              </div>
              <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
                <div className="text-xs text-base-content/60 uppercase font-medium mb-2">Attendance</div>
                <div className="text-3xl font-bold text-[var(--primary-color)]">{attendancePercentage}%</div>
                <div className="text-xs mt-1 text-[var(--primary-color)]">Attendance rate</div>
              </div>
            </div>

            {/* Sub-search and Export */}
            <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                  <input 
                    type="text" 
                    placeholder="Search within results (date or project)..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="w-full pl-10 pr-4 py-2 border border-base-300 rounded-lg text-xs bg-base-100"
                  />
                </div>
                <button 
                  onClick={handleExport} 
                  className="flex items-center justify-center gap-2 px-6 py-2 bg-[var(--primary-color)] text-white rounded-sm hover:opacity-90 transition font-medium text-xs disabled:opacity-50"
                  disabled={filteredData.length === 0}
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>
          </>
        )}

        {/* Table Area */}
        <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 overflow-hidden min-h-[300px]">
          {!hasSearched ? (
            <div className="flex flex-col justify-center items-center h-full py-20">
              <div className="flex flex-col items-center gap-3 text-center">
                <Search className="w-16 h-16 text-base-content/40" />
                <div className="font-semibold text-lg text-base-content">Ready to search</div>
                <div className="text-base-content/60 text-xs max-w-md">
                  Select a date range and click <bold>Search Records</bold> button to view attendance data for {employee.name}.
                </div>
              </div>
            </div>
          ) : isLoadingData ? (
             <div className="flex flex-col justify-center items-center h-full py-20">
              <Loader2 className="w-12 h-12 text-[var(--primary-color)] animate-spin" />
              <span className="text-sm mt-4 text-base-content/60">Fetching attendance records...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-base-200 border-b border-base-300">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-base-content/80 uppercase">#</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-base-content/80 uppercase">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-base-content/80 uppercase">Day</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-base-content/80 uppercase">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-base-content/80 uppercase">Project</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-base-content/80 uppercase">Indicator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-300">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Calendar className="w-12 h-12 text-base-content/40" />
                          <div className="font-medium text-xs text-base-content">No records found</div>
                          <div className="text-base-content/60 text-xs">Try adjusting your filters</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((record, i) => {
                      const date = new Date(record.date);
                      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
                      const statusColors = {
                        Present: { bg: "bg-success/10", text: "text-success", icon: <CheckCircle className="w-5 h-5 text-success" /> },
                        Absent: { bg: "bg-error/10", text: "text-error", icon: <XCircle className="w-5 h-5 text-error" /> },
                        Leave: { bg: "bg-warning/10", text: "text-warning", icon: <Clock className="w-5 h-5 text-warning" /> }
                      };
                      // Default fallback if status is undefined or not in map
                      const statusStyle = statusColors[record.status] || { bg: "bg-base-200", text: "text-base-content", icon: null };
                      
                      return (
                        <tr key={i} className="hover:bg-base-200">
                          <td className="px-6 py-4 text-xs text-base-content">{i + 1}</td>
                          <td className="px-6 py-4 text-xs text-base-content whitespace-nowrap">{date.toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-xs text-base-content">{dayName}</td>
                          <td className="px-6 py-4">
                            <span className={`${statusStyle.bg} ${statusStyle.text} px-3 py-1 rounded-full text-xs font-medium`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-base-content">
                            {record.projectName || <span className="text-base-content/40 italic">No project</span>}
                          </td>
                          <td className="px-6 py-4 text-center mx-auto">{statusStyle.icon}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Info */}
        {hasSearched && filteredData.length > 0 && (
          <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
            <div className="text-xs text-base-content/60 text-center">
              Showing <strong className="text-[var(--primary-color)]">{filteredData.length}</strong> of <strong>{trackingData.length}</strong> records
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}