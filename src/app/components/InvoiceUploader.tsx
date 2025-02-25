"use client";
import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { db } from "@/lib/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceData {
  vendor: string;
  total_amount: number;
  items: LineItem[];
}

export default function InvoiceUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

  // Recalculate total when line items change
  useEffect(() => {
    if (invoiceData?.items) {
      const newTotal = invoiceData.items.reduce((sum, item) => sum + item.total, 0);
      setInvoiceData(prev => prev ? { ...prev, total_amount: newTotal } : null);
    }
  }, [invoiceData?.items]);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/*": [],
      "application/pdf": []
    },
    onDrop: (acceptedFiles) => setFile(acceptedFiles[0]),
  });

  const updateLineItem = (index: number, field: keyof LineItem, value: number) => {
    if (!invoiceData) return;

    const updatedItems = [...invoiceData.items];
    const item = { ...updatedItems[index] };

    item[field] = value;

    // Recalculate total for this line item
    if (field === 'quantity' || field === 'unit_price') {
      item.total = item.quantity * item.unit_price;
    }

    updatedItems[index] = item;
    setInvoiceData({ ...invoiceData, items: updatedItems });
  };

  const handleUpload = async () => {
    if (!file) return;
    setProcessing(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("/api/parse-invoice", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setInvoiceData(response.data);
    } catch (error) {
      console.error("Error processing invoice", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!invoiceData) return;

    try {
      await addDoc(collection(db, "invoices"), {
        vendor: invoiceData.vendor,
        total_amount: invoiceData.total_amount,
        date: new Date().toISOString(),
      });
      alert("Invoice saved successfully!");
    } catch (error) {
      console.error("Error saving invoice", error);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Upload Invoice</h2>

        <div {...getRootProps()} className="border-2 border-dashed border-primary rounded-box p-6 text-center cursor-pointer hover:bg-base-200 transition-colors">
          <input {...getInputProps()} />
          {file ? (
            <div className="flex items-center justify-center gap-2">
              <i className="fas fa-file-invoice" />
              <span>{file.name}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <i className="fas fa-cloud-upload-alt text-2xl" />
              <p>Drag & drop or click to upload an invoice</p>
            </div>
          )}
        </div>

        <button
          onClick={handleUpload}
          className={`btn btn-primary ${processing ? 'loading' : ''}`}
          disabled={!file || processing}
        >
          {processing ? 'Processing...' : 'Upload & Extract'}
        </button>

        {invoiceData && (
          <div className="card bg-base-200 p-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Vendor</span>
              </label>
              <input
                type="text"
                value={invoiceData.vendor}
                onChange={(e) => setInvoiceData({ ...invoiceData, vendor: e.target.value })}
                className="input input-bordered w-full"
              />
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.items?.map((item, index) => (
                    <tr key={index}>
                      <td>{item.description}</td>
                      <td>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value))}
                          className="input input-bordered input-sm w-20"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value))}
                          className="input input-bordered input-sm w-24"
                        />
                      </td>
                      <td className="font-semibold">${item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="text-right font-bold">Total Amount:</td>
                    <td className="font-bold text-primary">${invoiceData.total_amount.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <button
              onClick={handleConfirm}
              className="btn btn-success mt-4"
            >
              Confirm & Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
