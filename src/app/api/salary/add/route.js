

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import calculateSalaryPeriodMonth from '@/lib/utils'; 
import EmployeeSalary from '@/models/employeeSalary';

/**
 * Handles POST requests to add a new salary record.
 * Endpoint: /api/salary/add
 */
export async function POST(request) {
  try {
    // 1. Establish Database Connection
    await connectDB();

    // 2. Extract Data
    const body = await request.json();
    
    const { 
      employeeId, 
      fromDate, 
      toDate, 
      baseSalary, 
      absentDays, 
      allowances, 
      deductions, 
      expenses, 
      notes, 
      status,
      absentDeduction,
      expensesTotal,
      totalDeductions,
      netSalary,
      paidDate 
    } = body;

    // 3. Basic Input Validation
    if (!employeeId || !fromDate || !toDate || netSalary === undefined) {
      return NextResponse.json(
        { success: false, message: 'Missing required salary fields.' },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 4. CHECK FOR EXISTING RECORDS (Date Range Overlap Check)
    // ---------------------------------------------------------
    
    // Convert strings to Date objects for accurate comparison
    const newStart = new Date(fromDate);
    const newEnd = new Date(toDate);

    // Logic: An overlap occurs if (ExistingStart <= NewEnd) AND (ExistingEnd >= NewStart)
    const existingRecord = await EmployeeSalary.findOne({
      employeeId: employeeId,
      $and: [
        { fromDate: { $lte: newEnd } },  // Existing starts before (or on) new end
        { toDate: { $gte: newStart } }   // Existing ends after (or on) new start
      ]
    });

    if (existingRecord) {
      const existingStart = new Date(existingRecord.fromDate).toLocaleDateString();
      const existingEnd = new Date(existingRecord.toDate).toLocaleDateString();
      
      return NextResponse.json(
        { 
          success: false, 
          message: `Conflict: A salary record already exists for the period ${existingStart} to ${existingEnd}.` 
        },
        { status: 409 }
      );
    }
    // ---------------------------------------------------------

    // 5. Calculate Month Reference
    const monthReference = calculateSalaryPeriodMonth(fromDate, toDate); 

    // 6. Create Database Record
    const newRecord = await EmployeeSalary.create({
      employeeId,
      fromDate,
      toDate,
      month: monthReference,
      baseSalary,
      absentDays,
      allowances,
      deductions,
      expenses,
      notes,
      status,
      absentDeduction,
      expensesTotal,
      totalDeductions,
      netSalary,
      paidDate: status === 'Paid' ? new Date(paidDate) : null,
    });

    // 7. Return Success Response
    return NextResponse.json(
      { 
        success: true, 
        message: status === 'Paid' ? 'Salary paid and recorded' : 'Salary draft saved', 
        data: newRecord 
      },
      { status: 201 } 
    );

  } catch (error) {
    console.error("Salary Add Error:", error);
    return NextResponse.json(
      { success: false, message: 'Failed to create salary record.', error: error.message },
      { status: 500 }
    );
  }
}