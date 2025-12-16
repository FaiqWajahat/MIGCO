import connectDB from "@/lib/mongodb";
import EmployeeSalary from "@/models/employeeSalary";
import { NextResponse } from "next/server";


export async function DELETE(req, { params }) {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Extract ID from URL parameters
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Record ID is required" },
        { status: 400 }
      );
    }

    // 3. Find and Delete the record
    const deletedRecord = await EmployeeSalary.findByIdAndDelete(id);

    // 4. Handle case where record is not found
    if (!deletedRecord) {
      return NextResponse.json(
        { success: false, message: "Salary record not found" },
        { status: 404 }
      );
    }

    // 5. Return Success Response
    return NextResponse.json({
      success: true,
      message: "Salary record deleted successfully",
      id: deletedRecord._id
    });

  } catch (error) {
    console.error("Error deleting salary record:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}