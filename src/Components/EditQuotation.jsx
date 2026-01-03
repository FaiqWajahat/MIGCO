'use client'
import React, { useState, useEffect } from "react";
import { ChevronDown, ArrowLeft } from "lucide-react";
import axios from "axios";
import { errorToast, successToast } from "@/lib/toast";
import { useRouter, useParams } from "next/navigation";
import CustomLoader from "@/Components/CustomLoader";

const EditQuotation = () => {
  const router = useRouter();
  const params = useParams();
  const quotationId = params?.id;

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("Draft");
  
  const [formData, setFormData] = useState({
    clientName: "",
    projectName: "",
    referenceNo: "",
    date: "",
    totalAmount: "",
    status: "Draft",
    notes: ""
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  const statuses = [
    { label: "Draft", value: "Draft" },
    { label: "Sent", value: "Sent" },
    { label: "Accepted", value: "Accepted" },
    { label: "Rejected", value: "Rejected" }
  ];

  // Fetch quotation data on component mount
  useEffect(() => {
    const fetchQuotationData = async () => {
      if (!quotationId) {
        errorToast("Quotation ID not found");
        router.push('/Dashboard/Quotations');
        return;
      }

      setIsFetchingData(true);
      try {
        // Using POST as per the API created in previous step for getSingleQuotation
        const response = await axios.post(`/api/quotation/getSingleQuotation`, { quotationId });
        
        if (response.data.success && response.data.quotation) {
          const quotation = response.data.quotation;
          
          // Format the date for input field (YYYY-MM-DD)
          let formattedDate = "";
          if (quotation.date) {
            formattedDate = new Date(quotation.date).toISOString().split('T')[0];
          }

          setFormData({
            clientName: quotation.clientName || "",
            projectName: quotation.projectName || "",
            referenceNo: quotation.referenceNo || "",
            date: formattedDate,
            totalAmount: quotation.totalAmount?.toString() || "",
            status: quotation.status || "Draft",
            notes: quotation.notes || ""
          });

          setSelectedStatus(quotation.status || "Draft");
        } else {
          errorToast(response.data.message || "Failed to fetch quotation data");
          router.push('/Dashboard/Quotations');
        }
      } catch (error) {
        console.error('Error fetching quotation:', error);
        errorToast(
          error.response?.data?.message || 'Failed to load quotation data. Please try again.'
        );
        router.push('/Dashboard/Quotations');
      } finally {
        setIsFetchingData(false);
      }
    };

    fetchQuotationData();
  }, [quotationId, router]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setHasChanges(true);
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Project Name validation
    if (!formData.projectName.trim()) {
      newErrors.projectName = "Project name is required";
    }

    // Reference No validation
    if (!formData.referenceNo.trim()) {
      newErrors.referenceNo = "Reference number is required";
    }

    // Total Amount validation
    if (!formData.totalAmount) {
        newErrors.totalAmount = "Total amount is required";
    } else if (parseFloat(formData.totalAmount) < 0) {
        newErrors.totalAmount = "Amount cannot be negative";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStatusSelect = (status) => {
    setSelectedStatus(status.label);
    setFormData(prev => ({
      ...prev,
      status: status.value
    }));
    setIsStatusOpen(false);
    setHasChanges(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Using PUT as per the API created earlier for updateQuotation
      // We need to send the _id in the body as per the API logic
      const payload = {
        _id: quotationId,
        ...formData
      };

      const response = await axios.put(`/api/quotation/updateQuotation`, payload);

      if (response.data.success) {
        successToast(response.data.message || "Quotation Updated Successfully");
        setHasChanges(false);
        
        // Redirect back to list after a short delay
        setTimeout(() => {
          router.push('/Dashboard/Quotations');
        }, 1500);
      } else {
        errorToast(response.data.message || "Failed to update quotation");
      }
      
    } catch (error) {
      console.error('Error updating quotation:', error);
      errorToast(
        error.response?.data?.message || 'Failed to update quotation. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      const confirmLeave = window.confirm(
        "You have unsaved changes. Are you sure you want to leave?"
      );
      if (!confirmLeave) return;
    }
    router.push('/Dashboard/Quotations');
  };

  // Loading state while fetching data
  if (isFetchingData) {
    return (
     <CustomLoader text={"Loading quotation details..."}/>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-6 mx-4 flex items-center gap-4 justify-between">
          <div>
            <h2 className="text-2xl font-bold text-base-content">Edit Quotation</h2>
            <p className="text-sm text-base-content/60 mt-1 hidden md:block">
              Update quotation details and status.
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="btn btn-ghost btn-sm gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          
        </div>

        <div className="">
          <div className="p-6">
            {/* Form */}
            <div className="space-y-6">
              
              {/* Project & Reference Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Project Name */}
                <div>
                  <label className="block text-sm font-medium text-base-content mb-2">
                    Project Name <span className="text-error">*</span>
                  </label>
                  <input
                    name="projectName"
                    type="text"
                    value={formData.projectName}
                    onChange={handleInputChange}
                    placeholder="Enter project name"
                    className={`input input-bordered w-full ${errors.projectName ? 'input-error' : ''}`}
                    disabled={isLoading}
                  />
                  {errors.projectName && (
                    <p className="text-error text-xs mt-1">{errors.projectName}</p>
                  )}
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-sm font-medium text-base-content mb-2">
                    Reference No. <span className="text-error">*</span>
                  </label>
                  <input
                    name="referenceNo"
                    type="text"
                    value={formData.referenceNo}
                    onChange={handleInputChange}
                    placeholder="e.g., QT-2025-001"
                    className={`input input-bordered w-full ${errors.referenceNo ? 'input-error' : ''}`}
                    disabled={isLoading}
                  />
                  {errors.referenceNo && (
                    <p className="text-error text-xs mt-1">{errors.referenceNo}</p>
                  )}
                </div>
              </div>

              {/* Client & Date Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Client Name */}
                <div>
                  <label className="block text-sm font-medium text-base-content mb-2">
                    Client Name
                  </label>
                  <input
                    name="clientName"
                    type="text"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    placeholder="Enter client or company name"
                    className="input input-bordered w-full"
                    disabled={isLoading}
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-base-content mb-2">
                    Quotation Date
                  </label>
                  <input
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="input input-bordered w-full"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Amount & Status Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Total Amount */}
                <div>
                  <label className="block text-sm font-medium text-base-content mb-2">
                    Total Amount (SAR) <span className="text-error">*</span>
                  </label>
                  <input
                    name="totalAmount"
                    type="number"
                    value={formData.totalAmount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className={`input input-bordered w-full ${errors.totalAmount ? 'input-error' : ''}`}
                    min="0"
                    step="0.01"
                    disabled={isLoading}
                  />
                  {errors.totalAmount && (
                    <p className="text-error text-xs mt-1">{errors.totalAmount}</p>
                  )}
                </div>

                {/* Status Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-base-content mb-2">
                    Status <span className="text-base-content/50">(Default: Draft)</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => !isLoading && setIsStatusOpen(!isStatusOpen)}
                      className="input input-bordered w-full cursor-pointer flex items-center justify-between text-left"
                      disabled={isLoading}
                    >
                      <span className="text-base-content">
                        {selectedStatus}
                      </span>
                      <ChevronDown className={`w-5 h-5 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isStatusOpen && (
                      <div className="absolute z-50 w-full mt-2 bg-base-100 border border-base-300 rounded-lg shadow-lg">
                        {statuses.map((status) => (
                          <button
                            key={status.label}
                            type="button"
                            onClick={() => handleStatusSelect(status)}
                            className="w-full text-left px-4 py-2.5 hover:bg-base-200 transition-colors text-sm"
                          >
                            {status.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div>
                <label className="block text-sm font-medium text-base-content mb-2">
                  Notes / Description
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Add any additional details, terms, or notes..."
                  className="textarea textarea-bordered w-full h-24 resize-none"
                  disabled={isLoading}
                ></textarea>
              </div>

              {/* Divider */}
              <div className="border-t border-base-300 mb-6 mt-10"></div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-ghost rounded-sm"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading || !hasChanges}
                  className="btn bg-[var(--primary-color)] rounded-sm text-white hover:opacity-90 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <span className="loading loading-spinner loading-sm" style={{ color: 'white' }}></span>
                      Updating...
                    </>
                  ) : (
                    'Update Quotation'
                  )}
                </button>
              </div>

              {/* Unsaved Changes Warning */}
              {hasChanges && !isLoading && (
                <div className="alert alert-warning shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm">You have unsaved changes. Don't forget to save!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditQuotation;