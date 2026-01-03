import mongoose from "mongoose";


const QuotationSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      
  
    },
    projectName: {
      type: String,
      required: true
     
     
    },
    referenceNo: {
        type: String,
      trim: true,
      unique    : true,
    },
  
  
    date: {
      type: Date,
      default: null,
    },

    totalAmount: {
      type: Number,
      default: 0.00,
    },
    status: {
     type:String,
     default:"Draft",
    enum: ['Draft', 'Sent', 'Accepted', 'Rejected' ]

    },
    notes: {
        type: String,
        
    },
  },
  { 
    timestamps: true
  }
);

const Quotation = mongoose.models.Quotation || mongoose.model("Quotation", QuotationSchema);

export default Quotation;