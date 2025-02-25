"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

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
  date: string;
}

interface VendorSummary {
  totalSpent: number;
  invoiceCount: number;
  averageInvoice: number;
  mostPurchasedItems: { item: string; quantity: number }[];
}

export default function ExpenseAnalytics() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [vendorStats, setVendorStats] = useState<Record<string, VendorSummary>>({});
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const q = query(collection(db, "invoices"), orderBy("date", "asc"));
        const querySnapshot = await getDocs(q);
        const fetchedInvoices = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Invoice[];

        setInvoices(fetchedInvoices);
        calculateStats(fetchedInvoices);
      } catch (error) {
        console.error("Error fetching invoices:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const calculateStats = (invoiceData: Invoice[]) => {
    const stats: Record<string, VendorSummary> = {};
    let total = 0;

    invoiceData.forEach(invoice => {
      total += invoice.total_amount;

      if (!stats[invoice.vendor]) {
        stats[invoice.vendor] = {
          totalSpent: 0,
          invoiceCount: 0,
          averageInvoice: 0,
          mostPurchasedItems: []
        };
      }

      // Update vendor stats
      stats[invoice.vendor].totalSpent += invoice.total_amount;
      stats[invoice.vendor].invoiceCount += 1;

      // Track item frequencies
      const itemCounts = new Map<string, number>();
      invoice.items.forEach(item => {
        const current = itemCounts.get(item.description) || 0;
        itemCounts.set(item.description, current + item.quantity);
      });

      // Update most purchased items
      stats[invoice.vendor].mostPurchasedItems = Array.from(itemCounts.entries())
        .map(([item, quantity]) => ({ item, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 3);
    });

    // Calculate averages
    Object.keys(stats).forEach(vendor => {
      stats[vendor].averageInvoice = stats[vendor].totalSpent / stats[vendor].invoiceCount;
    });

    setVendorStats(stats);
    setTotalSpent(total);
  };

  const getChartData = () => {
    const monthlyTotals = new Map<string, number>();

    invoices.forEach(invoice => {
      const monthKey = format(parseISO(invoice.date), 'MMM yyyy');
      const current = monthlyTotals.get(monthKey) || 0;
      monthlyTotals.set(monthKey, current + invoice.total_amount);
    });

    return {
      labels: Array.from(monthlyTotals.keys()),
      datasets: [{
        label: 'Monthly Expenses',
        data: Array.from(monthlyTotals.values()),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }]
    };
  };

  const getVendorChartData = () => ({
    labels: Object.keys(vendorStats),
    datasets: [{
      data: Object.values(vendorStats).map(stat => stat.totalSpent),
      backgroundColor: [
        '#FF6384',
        '#36A2EB',
        '#FFCE56',
        '#4BC0C0',
        '#9966FF',
        '#FF9F40'
      ]
    }]
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Total Spent</div>
            <div className="stat-value text-primary">${totalSpent.toFixed(2)}</div>
            <div className="stat-desc">{invoices.length} invoices processed</div>
          </div>
        </div>

        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Average Invoice</div>
            <div className="stat-value text-secondary">
              ${(totalSpent / invoices.length).toFixed(2)}
            </div>
            <div className="stat-desc">Per invoice average</div>
          </div>
        </div>

        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Unique Vendors</div>
            <div className="stat-value">{Object.keys(vendorStats).length}</div>
            <div className="stat-desc">Different suppliers</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Expenses Over Time</h2>
            <Line data={getChartData()} options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                }
              }
            }} />
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Expenses by Vendor</h2>
            <Doughnut data={getVendorChartData()} options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'right' as const,
                }
              }
            }} />
          </div>
        </div>
      </div>

      {/* Vendor Breakdown */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Vendor Analysis</h2>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Total Spent</th>
                  <th>Invoices</th>
                  <th>Avg. Invoice</th>
                  <th>Most Purchased Items</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(vendorStats)
                  .sort(([, a], [, b]) => b.totalSpent - a.totalSpent)
                  .map(([vendor, stats]) => (
                    <tr key={vendor}>
                      <td>{vendor}</td>
                      <td>${stats.totalSpent.toFixed(2)}</td>
                      <td>{stats.invoiceCount}</td>
                      <td>${stats.averageInvoice.toFixed(2)}</td>
                      <td>
                        <div className="flex flex-col gap-1">
                          {stats.mostPurchasedItems.map((item, i) => (
                            <span key={i} className="text-sm">
                              {item.item} ({item.quantity} units)
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 