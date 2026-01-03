import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Quotation from "@/models/quotation";

export async function POST(req) {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Parse the request body
    const body = await req.json();
    const { 
      clientName, 
      projectName, 
      referenceNo,  
      date, 
      totalAmount, 
      status, 
      notes 
    } = body;

    // 3. Backend Validation (Double check required fields)
    if (!projectName || !referenceNo  || totalAmount === undefined || totalAmount === null) {
      return NextResponse.json(
        { success: false, message: "Missing required fields (Project Name, Reference No, Role, or Amount)." },
        { status: 400 }
      );
    }

    // 4. Check for Duplicate Reference Number
    // The schema enforces unique: true, but a manual check allows for a cleaner error message
    const existingQuotation = await Quotation.findOne({ referenceNo: referenceNo.trim() });
    
    if (existingQuotation) {
      return NextResponse.json(
        { success: false, message: `A quotation with Reference No '${referenceNo}' already exists.` },
        { status: 409 } // 409 Conflict
      );
    }

    // 5. Create new Quotation
    const newQuotation = new Quotation({
      clientName,
      projectName,
      referenceNo,
      
      date: date ? new Date(date) : null,
      totalAmount: Number(totalAmount), // Ensure it's a number
      status: status || 'Draft',
      notes
    });

    // 6. Save to DB
    await newQuotation.save();

    // 7. Return Success
    return NextResponse.json(
      { success: true, message: "Quotation created successfully!", data: newQuotation },
      { status: 201 }
    );

  } catch (error) {
    console.error("Error adding quotation:", error);

    // Handle Mongoose Duplicate Key Error (fallback)
    if (error.code === 11000) {
       return NextResponse.json(
        { success: false, message: "Duplicate Reference Number detected." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}