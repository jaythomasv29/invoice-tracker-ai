"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    const fetchInvoices = async () => {
      const querySnapshot = await getDocs(collection(db, "invoices"));
      setInvoices(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchInvoices();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold">Invoices</h2>
      {invoices.map((invoice) => (
        <div key={invoice.id} className="p-2 border-b">
          <p>Vendor: {invoice.vendor}</p>
          <p>Total: ${invoice.total}</p>
        </div>
      ))}
    </div>
  );
}
