import { NextResponse } from "next/server";

import EmployeeSalary from "@/models/employeeSalary";
import connectDB from "@/lib/mongodb";


export async function PUT(req, { params }) {
  try {
    // 1. Connect to Database
    await connectDB()

    // 2. Extract ID from URL parameters
    const { id } = await params;

    // 3. Parse the Request Body
    const body = await req.json();
    const { status, paidDate } = body;

    // 4. Validation
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Record ID is required" },
        { status: 400 }
      );
    }

    // 5. Find and Update the Salary Record
    // We use $set to only update the specific fields provided
    const updatedSalary = await EmployeeSalary.findByIdAndUpdate(
      id,
      { 
        $set: { 
          status: status, 
          paidDate: paidDate 
        } 
      },
      { new: true } // Return the updated document
    );

    // 6. Handle case where record is not found
    if (!updatedSalary) {
      return NextResponse.json(
        { success: false, message: "Salary record not found" },
        { status: 404 }
      );
    }

    // 7. Return Success Response
    return NextResponse.json({
      success: true,
      message: "Salary status updated successfully",
      data: updatedSalary,
    });

  } catch (error) {
    console.error("Error updating salary:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}