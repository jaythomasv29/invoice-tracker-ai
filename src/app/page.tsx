import Image from "next/image";
import InvoiceUploader from "./components/InvoiceUploader";
export default function Home() {
  return (
    <div className="p-4">
      <InvoiceUploader />
    </div>
  );
}
