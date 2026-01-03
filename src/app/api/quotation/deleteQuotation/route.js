import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Quotation from "@/models/quotation";

export async function DELETE(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { quotationId } = body;

    if (!quotationId) {
      return NextResponse.json(
        { success: false, message: "Quotation ID is required" },
        { status: 400 }
      );
    }

    const deletedQuotation = await Quotation.findByIdAndDelete(quotationId);

    if (!deletedQuotation) {
      return NextResponse.json(
        { success: false, message: "Quotation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Quotation deleted successfully" },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error deleting quotation:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete quotation" },
      { status: 500 }
    );
  }
}