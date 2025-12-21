import connectDB from "@/lib/mongodb";
import EmployeeSalary from "@/models/employeeSalary";
import employeeExpense from "@/models/employeeExpenses"; // Import Expense Model
import { NextResponse } from "next/server";

export async function DELETE(req, { params }) {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Extract ID
    const { id } = await params; // Ensure params are awaited in Next.js 15+

    if (!id) {
      return NextResponse.json({ success: false, message: "Record ID is required" }, { status: 400 });
    }

    // 3. Find the record FIRST (Do not delete yet)
    // We need to read the data inside it to know what to revert
    const salaryRecord = await EmployeeSalary.findById(id);

    if (!salaryRecord) {
      return NextResponse.json({ success: false, message: "Salary record not found" }, { status: 404 });
    }

    // ------------------------------------------------------------------
    // 4. REVERSE EXPENSE LOGIC (Only if Salary was "Paid")
    // ------------------------------------------------------------------
    if (salaryRecord.status === 'Paid' && salaryRecord.linkedExpenses?.length > 0) {
      
      console.log(`Reverting ${salaryRecord.linkedExpenses.length} linked expenses...`);

      // Run updates in parallel for speed
      await Promise.all(salaryRecord.linkedExpenses.map(async (link) => {
        try {
          const { expenseId, amount } = link;
          const amountToRevert = parseFloat(amount);

          if (!amountToRevert || amountToRevert <= 0) return;

          // Find the original expense
          const expenseDoc = await employeeExpense.findById(expenseId);

          if (expenseDoc) {
            // A. Decrease the paidAmount (Reverse the payment)
            const currentPaid = expenseDoc.paidAmount || 0;
            let newPaidTotal = currentPaid - amountToRevert;

            // Safety check: Prevent negative numbers
            if (newPaidTotal < 0) newPaidTotal = 0;

            // Fix floating point precision
            expenseDoc.paidAmount = Math.round(newPaidTotal * 100) / 100;

            // B. Re-evaluate Status
            // If nothing is paid anymore, it goes back to 'Pending'
            if (expenseDoc.paidAmount <= 0) {
              expenseDoc.status = 'Pending';
            } 
            // If still partially paid (but less than total), it is 'Partial'
            else if (expenseDoc.paidAmount < expenseDoc.amount) {
              expenseDoc.status = 'Partial';
            }
            // (If it's still fully paid, we leave it as Completed, though unlikely in a revert)

            await expenseDoc.save();
            console.log(`Reverted Expense ${expenseId}: Restored ${amountToRevert}, Status now: ${expenseDoc.status}`);
          }
        } catch (innerError) {
          console.error(`Failed to revert expense ${link.expenseId}:`, innerError);
        }
      }));
    }

    // 5. Now it is safe to Delete the Salary Record
    await EmployeeSalary.findByIdAndDelete(id);

    // 6. Return Success Response
    return NextResponse.json({
      success: true,
      message: "Salary record deleted and expenses reverted successfully",
      id: salaryRecord._id
    });

  } catch (error) {
    console.error("Error deleting salary record:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}