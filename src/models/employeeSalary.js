// /models/EmployeeSalary.js

import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  }
}, { _id: false }); // Do not create separate IDs for subdocuments

const EmployeeSalarySchema = new mongoose.Schema({
  // --- Core Reference ---
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee', // Assuming you have an Employee model
    required: true,
  },
  
  // --- Period Details ---
  fromDate: {
    type: Date,
    required: true,
  },
  toDate: {
    type: Date,
    required: true,
  },
  // Note: monthReference in frontend is UI-only, month can be derived or stored
  month: { // For easy filtering/display, derived from fromDate/toDate
    type: String, // e.g., '2023-11'
    required: false,
  },

  // --- Calculation Inputs ---
  baseSalary: {
    type: Number,
    required: true,
    min: 0,
  },
  absentDays: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  allowances: { // Bonuses/Overtime
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  deductions: { // Other deductions (non-expense, non-absent)
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  expenses: [ExpenseSchema], // Detailed loan/expense items
  notes: {
    type: String,
    trim: true,
  },

  // --- Calculated Outputs (Can be recalculated if needed, but stored for history) ---
  absentDeduction: { // dailyRate * absentDays
    type: Number,
    required: true,
  },
  expensesTotal: { // Sum of expenses[].amount
    type: Number,
    required: true,
  },
  totalDeductions: { // absentDeduction + expensesTotal + deductions
    type: Number,
    required: true,
  },
  netSalary: {
    type: Number,
    required: true,
    min: 0,
  },

  // --- Status & Payment ---
  status: {
    type: String,
    enum: ['Pending', 'Paid'],
    required: true,
    default: 'Pending',
  },
  paidDate: {
    type: Date,
    required: function() { return this.status === 'Paid'; }, // Required only if status is Paid
    default: null,
  }

}, { timestamps: true });

const EmployeeSalary = mongoose.models.EmployeeSalary || mongoose.model('EmployeeSalary', EmployeeSalarySchema);

export default EmployeeSalary;