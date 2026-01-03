'use client'
import React, { useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import axios from "axios";
import { errorToast, successToast } from "@/lib/toast";
import { useRouter } from "next/navigation";

const AddQuotation = () => {
  const route = useRouter();
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

  const statuses = [
    { label: "Draft", value: "Draft" },
    { label: "Sent", value: "Sent" },
    { label: "Accepted", value: "Accepted" },
    { label: "Rejected", value: "Rejected" }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

    // Reference No validation (Compulsory)
    if (!formData.referenceNo.trim()) {
        newErrors.referenceNo = "Reference number is required";
    }


    // Total Amount validation (Compulsory)
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    // Calculate today's date in YYYY-MM-DD format for default
    const today = new Date().toISOString().split('T')[0];

    // Create a payload object. Use existing date, or fallback to 'today'
    const dataToSend = {
      ...formData,
      date: formData.date || today,
      // Ensure amount is sent as a number
      totalAmount: parseFloat(formData.totalAmount)
    };

    try {
      const response = await axios.post('/api/quotation/addQuotation', dataToSend);

      const success = response.data.success;

      if (!success) {
        errorToast(response.data.message || "Something went wrong");
        setIsLoading(false);
        return;
      }

      successToast(response.data.message || "Quotation Created Successfully");

      // Reset form
      setFormData({
        clientName: "",
        projectName: "",
        referenceNo: "",
        
        date: "",
        totalAmount: "",
        status: "Draft",
        notes: ""
      });
      setSelectedStatus("Draft");
      setErrors({});
      route.back();

    } catch (error) {
      console.error('Error adding quotation:', error);
      errorToast(error.response?.data?.message || 'Failed to create quotation. Please try again.');
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 mx-4 flex items-center gap-4 justify-between">
          <div>
             <h2 className="text-2xl font-bold text-base-content">Add Quotation</h2>
            <p className="text-sm text-base-content/60 mt-1 hidden md:block">
              Add a new quotation for a client project.
            </p>
          </div>
          <button
            onClick={() => { route.back() }}
            className="btn btn-ghost btn-sm gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

        </div>
        <div className="">
          <div className="p-4">
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
                    />
                    {errors.projectName && (
                    <p className="text-error text-xs mt-1">{errors.projectName}</p>
                    )}
                </div>

                 {/* Client Name */}
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
                    />
                    {errors.referenceNo && (
                    <p className="text-error text-xs mt-1">{errors.referenceNo}</p>
                    )}
                </div>

                
              </div>

              {/* Client & Role Section */}
              <div className="grid grid-cols-1 md:grid-cols-2  gap-6">
               
   {/* Reference Number */}
               


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
                    />
                </div>


                     <div>
                  <label className="block text-sm font-medium text-base-content mb-2">
                    Quotation Date <span className="text-base-content/50">(Defaults to Today)</span>
                  </label>
                  <input
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="input input-bordered w-full"
                  />
                </div>
               
              </div>

              {/* Date, Amount & Status Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date */}
           

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
                      onClick={() => setIsStatusOpen(!isStatusOpen)}
                      className="input input-bordered w-full cursor-pointer flex items-center justify-between text-left"
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
                ></textarea>
              </div>

              {/* Divider */}
              <div className="border-t border-base-300 mb-6 mt-10"></div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                        clientName: "",
                        projectName: "",
                        referenceNo: "",
                        role: "",
                        date: "",
                        totalAmount: "",
                        status: "Draft",
                        notes: ""
                    });
                    setSelectedStatus("Draft");
                    setErrors({});
                  }}
                  className="btn btn-ghost rounded-sm"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="btn bg-[var(--primary-color)] rounded-sm text-white hover:opacity-90 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <span className="loading loading-spinner loading-sm" style={{ color: 'white' }}></span>
                    Adding...
                    </>
                  ) : (
                    'Add Quotation'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddQuotation;