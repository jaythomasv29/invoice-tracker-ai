"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Invoice {
  id: string;
  vendor: string;
  items: LineItem[];
  total_amount: number;
  date?: string;
}

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const q = query(collection(db, "invoices"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        setInvoices(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Invoice[]);
      } catch (error) {
        console.error("Error fetching invoices:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          <h2 className="card-title">No Invoices Yet</h2>
          <p>Upload your first invoice to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Recent Invoices</h2>
        <div className="badge badge-primary">{invoices.length} Total</div>
      </div>

      {invoices.map((invoice) => (
        <div key={invoice.id} className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex justify-between items-center">
              <h3 className="card-title text-primary">{invoice.vendor}</h3>
              <div className="flex gap-2 items-center">
                {invoice.date && (
                  <span className="badge badge-ghost">
                    {new Date(invoice.date).toLocaleDateString()}
                  </span>
                )}
                <span className="badge badge-secondary">
                  ${invoice.total_amount?.toFixed(2)}
                </span>
              </div>
            </div>

            {invoice.items && (
              <div className="overflow-x-auto mt-4">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Unit Price</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.description}</td>
                        <td className="text-right">{item.quantity}</td>
                        <td className="text-right">${item.unit_price.toFixed(2)}</td>
                        <td className="text-right">${item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="text-right font-bold">Total Amount:</td>
                      <td className="text-right font-bold text-primary">
                        ${invoice.total_amount?.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
