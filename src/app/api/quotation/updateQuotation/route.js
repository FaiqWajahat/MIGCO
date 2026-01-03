import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Quotation from "@/models/quotation";

export async function PUT(req) {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Parse the request body
    const body = await req.json();
    const { 
      _id, // The ID is required to find the document
      clientName, 
      projectName, 
      referenceNo, 
      date, 
      totalAmount, 
      status, 
      notes 
    } = body;

    // 3. Validation: Check if ID exists
    if (!_id) {
      return NextResponse.json(
        { success: false, message: "Quotation ID is required for updates" },
        { status: 400 }
      );
    }

    // 4. Validation: Check required fields (same as Create)
    if (!projectName || !referenceNo || totalAmount === undefined || totalAmount === null) {
        return NextResponse.json(
          { success: false, message: "Project Name, Reference No, and Total Amount are required." },
          { status: 400 }
        );
    }

    // 5. Prepare the update object
    // We explicitly map fields to prevent unwanted fields from being updated
    const updateData = {
      clientName,
      projectName,
      referenceNo,
      date: date ? new Date(date) : null,
      totalAmount: Number(totalAmount),
      status,
      notes
    };

    // 6. Perform the Update
    // { new: true } returns the updated document
    // { runValidators: true } ensures schema rules (like type checks) are enforced
    const updatedQuotation = await Quotation.findByIdAndUpdate(
      _id,
      updateData,
      { new: true, runValidators: true }
    );

    // 7. Handle Not Found
    if (!updatedQuotation) {
      return NextResponse.json(
        { success: false, message: "Quotation not found" },
        { status: 404 }
      );
    }

    // 8. Return Success
    return NextResponse.json(
      { success: true, message: "Quotation updated successfully", data: updatedQuotation },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error updating quotation:", error);
    
    // Handle Duplicate Reference Number Error
    if (error.code === 11000) {
        return NextResponse.json(
         { success: false, message: "A quotation with this Reference Number already exists." },
         { status: 409 }
       );
     }

    return NextResponse.json(
      { success: false, message: "Failed to update quotation" },
      { status: 500 }
    );
  }
}