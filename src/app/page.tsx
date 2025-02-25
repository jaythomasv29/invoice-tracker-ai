import InvoiceUploader from '@/components/InvoiceUploader';
import InvoiceExplorer from '@/components/InvoiceExplorer';
import ExpenseAnalytics from '@/components/ExpenseAnalytics';
import ExpenseInsights from '@/components/ExpenseInsights';

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <div className="space-y-8">
        <InvoiceUploader />
        <ExpenseInsights />
        <ExpenseAnalytics />
        <InvoiceExplorer />
      </div>
    </main>
  );
}
