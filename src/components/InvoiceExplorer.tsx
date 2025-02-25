"use client";
import { useState, useEffect } from "react";
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

export default function InvoiceExplorer() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [vendors, setVendors] = useState<string[]>([]);
    const [selectedVendor, setSelectedVendor] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                const q = query(collection(db, "invoices"), orderBy("date", "desc"));
                const querySnapshot = await getDocs(q);
                const fetchedInvoices = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Invoice[];

                setInvoices(fetchedInvoices);

                // Extract unique vendors
                const uniqueVendors = Array.from(new Set(fetchedInvoices.map(inv => inv.vendor)));
                setVendors(uniqueVendors);
            } catch (error) {
                console.error("Error fetching invoices:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchInvoices();
    }, []);

    const filteredInvoices = invoices.filter(invoice => {
        const matchesVendor = selectedVendor === 'all' || invoice.vendor === selectedVendor;
        const matchesSearch = invoice.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.items.some(item => item.description.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesVendor && matchesSearch;
    });

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
        );
    }

    return (
        <div className="drawer lg:drawer-open">
            <input id="invoice-drawer" type="checkbox" className="drawer-toggle" />

            <div className="drawer-content p-6">
                {/* Top Bar */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="form-control flex-1">
                        <input
                            type="text"
                            placeholder="Search invoices..."
                            className="input input-bordered w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="select select-bordered"
                        value={selectedVendor}
                        onChange={(e) => setSelectedVendor(e.target.value)}
                    >
                        <option value="all">All Vendors</option>
                        {vendors.map(vendor => (
                            <option key={vendor} value={vendor}>{vendor}</option>
                        ))}
                    </select>
                </div>

                {/* Invoice Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredInvoices.map((invoice) => (
                        <div
                            key={invoice.id}
                            className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer"
                            onClick={() => setSelectedInvoice(invoice)}
                        >
                            <div className="card-body">
                                <h3 className="card-title text-primary">{invoice.vendor}</h3>
                                <div className="flex gap-2">
                                    {invoice.date && (
                                        <span className="badge badge-ghost">
                                            {new Date(invoice.date).toLocaleDateString()}
                                        </span>
                                    )}
                                    <span className="badge badge-secondary">
                                        ${invoice.total_amount.toFixed(2)}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    {invoice.items.length} items
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Invoice Details Drawer */}
            <div className="drawer-side">
                <label htmlFor="invoice-drawer" className="drawer-overlay"></label>
                <div className="p-4 w-full max-w-2xl min-h-full bg-base-200">
                    {selectedInvoice ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold">{selectedInvoice.vendor}</h2>
                                <button
                                    className="btn btn-circle btn-ghost"
                                    onClick={() => setSelectedInvoice(null)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="stats shadow w-full">
                                <div className="stat">
                                    <div className="stat-title">Date</div>
                                    <div className="stat-value text-lg">
                                        {selectedInvoice.date && new Date(selectedInvoice.date).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="stat">
                                    <div className="stat-title">Total Amount</div>
                                    <div className="stat-value text-lg text-primary">
                                        ${selectedInvoice.total_amount.toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
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
                                        {selectedInvoice.items.map((item, index) => (
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
                                            <td colSpan={3} className="text-right font-bold">Total:</td>
                                            <td className="text-right font-bold">
                                                ${selectedInvoice.total_amount.toFixed(2)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p>Select an invoice to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 