import { NextResponse } from 'next/server';
import { storage, db } from "@/lib/firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import Tesseract from "tesseract.js";

// This is the App Router way of handling POST requests
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    console.log('Storage bucket being used:', storage.app.options.storageBucket);

    try {
      // Create unique filename
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}-${file.name}`;
      console.log('Attempting to upload:', uniqueFileName);

      // Upload to Firebase Storage
      const fileBuffer = await file.arrayBuffer();
      const storageRef = ref(storage, `invoices/${uniqueFileName}`);

      console.log('Storage reference created:', storageRef.fullPath);

      const uploadResult = await uploadBytes(storageRef, fileBuffer, {
        contentType: file.type,
        customMetadata: {
          originalName: file.name
        }
      });

      console.log('Upload completed:', uploadResult);

      const fileURL = await getDownloadURL(storageRef);

      // Perform OCR if it's an image
      if (file.type.startsWith('image/')) {
        const { data: { text } } = await Tesseract.recognize(fileURL, 'eng');
        const parsedData = parseInvoiceText(text);

        // Store in Firestore
        await addDoc(collection(db, "invoices"), {
          ...parsedData,
          fileURL,
          fileName: uniqueFileName,
          uploadedAt: new Date().toISOString()
        });

        return NextResponse.json({
          message: "Invoice uploaded and parsed!",
          data: parsedData
        });
      }

      // For non-image files
      return NextResponse.json({
        message: "File uploaded successfully!",
        fileURL
      });

    } catch (error: any) {
      console.error("Processing error:", {
        message: error.message,
        code: error.code,
        status: error.status_,
        customData: error.customData,
        serverResponse: error.serverResponse
      });

      return NextResponse.json({
        error: "Failed to process file",
        details: error.message,
        code: error.code,
        status: error.status_
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Request error:", error);
    return NextResponse.json(
      { error: "Failed to handle request", details: error.message },
      { status: 500 }
    );
  }
}

function parseInvoiceText(text: string) {
  const totalMatch = text.match(/Total:\s*\$?(\d+\.\d{2})/i);
  const items = text.split("\n").filter(line => /\$\d+\.\d{2}/.test(line));

  return {
    vendor: text.match(/Vendor:\s*(.*)/)?.[1] || "Unknown",
    total: totalMatch ? parseFloat(totalMatch[1]) : 0,
    items: items.map(line => {
      const parts = line.split(/\s+/);
      return { name: parts[0], price: parseFloat(parts[parts.length - 1]) };
    })
  };
}
