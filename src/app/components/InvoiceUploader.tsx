"use client";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { db } from "@/lib/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";

export default function InvoiceUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [invoiceData, setInvoiceData] = useState<{ vendor: string; total: number } | null>(null);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/*": [],
      "application/pdf": []
    },
    onDrop: (acceptedFiles) => setFile(acceptedFiles[0]),
  });

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
        total: invoiceData.total,
        date: new Date().toISOString(),
      });
      alert("Invoice saved successfully!");
    } catch (error) {
      console.error("Error saving invoice", error);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <div {...getRootProps()} className="border-dashed border-2 p-6 text-center cursor-pointer">
        <input {...getInputProps()} />
        {file ? <p>{file.name}</p> : <p>Drag & drop or click to upload an invoice</p>}
      </div>
      <button onClick={handleUpload} className="mt-4 p-2 bg-blue-500 text-white" disabled={processing}>
        {processing ? "Processing..." : "Upload & Extract"}
      </button>

      {invoiceData && (
        <div className="mt-4 p-4 border">
          <p><strong>Vendor:</strong> {invoiceData.vendor}</p>
          <p><strong>Total Amount:</strong> ${invoiceData.total.toFixed(2)}</p>
          <button onClick={handleConfirm} className="mt-4 p-2 bg-green-500 text-white">
            Confirm & Save
          </button>
        </div>
      )}
    </div>
  );
}
