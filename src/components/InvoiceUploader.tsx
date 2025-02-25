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
  const [showUploader, setShowUploader] = useState(false);

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
    onDrop: (acceptedFiles) => {
      setFile(acceptedFiles[0]);
      handleUpload(acceptedFiles[0]);
    },
  });

  const handleUpload = async (uploadFile: File) => {
    setProcessing(true);
    const formData = new FormData();
    formData.append("file", uploadFile);

    try {
      const response = await axios.post("/api/parse-invoice", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setInvoiceData(response.data);
    } catch (error) {
      console.error("Error processing invoice", error);
      // Show error toast
      const toast = document.createElement('div');
      toast.className = 'toast toast-end';
      toast.innerHTML = `
        <div class="alert alert-error">
          <span>Failed to process invoice</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!invoiceData) return;

    try {
      await addDoc(collection(db, "invoices"), {
        vendor: invoiceData.vendor,
        items: invoiceData.items,
        total_amount: invoiceData.total_amount,
        date: new Date().toISOString(),
      });

      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'toast toast-end';
      toast.innerHTML = `
        <div class="alert alert-success">
          <span>Invoice saved successfully!</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);

      setFile(null);
      setInvoiceData(null);
      setShowUploader(false);
    } catch (error) {
      console.error("Error saving invoice", error);
      const toast = document.createElement('div');
      toast.className = 'toast toast-end';
      toast.innerHTML = `
        <div class="alert alert-error">
          <span>Failed to save invoice</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  };

  if (!showUploader && !invoiceData) {
    return (
      <button
        onClick={() => setShowUploader(true)}
        className="btn btn-circle btn-lg btn-primary"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body p-4">
        {!invoiceData ? (
          <div {...getRootProps()} className="flex items-center gap-4">
            <input {...getInputProps()} />
            <button className="btn btn-circle btn-ghost" onClick={() => setShowUploader(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {processing ? (
              <div className="flex-1 flex justify-center">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            ) : (
              <div className="flex-1 text-center">
                <span className="text-base-content/70">Click to upload or drop invoice here</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={invoiceData.vendor}
                onChange={(e) => setInvoiceData({ ...invoiceData, vendor: e.target.value })}
                className="input input-bordered input-sm flex-1"
                placeholder="Vendor name"
              />
              <div className="badge badge-primary">${invoiceData.total_amount.toFixed(2)}</div>
              <button className="btn btn-circle btn-sm btn-success" onClick={handleConfirm}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                className="btn btn-circle btn-sm btn-ghost"
                onClick={() => {
                  setFile(null);
                  setInvoiceData(null);
                  setShowUploader(false);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 