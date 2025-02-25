"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

interface Insight {
  title: string;
  value: string;
  description: string;
  trend: "up" | "down" | "neutral";
}

export default function ExpenseInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateInsights = async () => {
      try {
        const q = query(collection(db, "invoices"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        const invoices = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Calculate various insights
        const insights: Insight[] = [];

        // Most recent expense
        if (invoices.length > 0) {
          insights.push({
            title: "Latest Purchase",
            value: `$${invoices[0].total_amount.toFixed(2)}`,
            description: `From ${invoices[0].vendor}`,
            trend: "neutral"
          });
        }

        // Month-over-month change
        if (invoices.length >= 2) {
          const thisMonth = invoices[0].total_amount;
          const lastMonth = invoices[1].total_amount;
          const change = ((thisMonth - lastMonth) / lastMonth) * 100;

          insights.push({
            title: "Monthly Change",
            value: `${Math.abs(change).toFixed(1)}%`,
            description: `${change >= 0 ? 'Increase' : 'Decrease'} from last month`,
            trend: change >= 0 ? "up" : "down"
          });
        }

        // Add more insights as needed...

        setInsights(insights);
      } catch (error) {
        console.error("Error calculating insights:", error);
      } finally {
        setLoading(false);
      }
    };

    calculateInsights();
  }, []);

  if (loading) {
    return <span className="loading loading-dots loading-md"></span>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {insights.map((insight, index) => (
        <div key={index} className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm opacity-70">{insight.title}</h2>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{insight.value}</p>
              {insight.trend === "up" && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-error" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {insight.trend === "down" && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-success" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <p className="text-sm opacity-70">{insight.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
} 