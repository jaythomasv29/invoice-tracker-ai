import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import { OpenAI } from "openai";

export const config = { api: { bodyParser: false } };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const form = formidable({
    uploadDir: "/tmp",
    keepExtensions: true
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("File upload error:", err);
      return res.status(500).json({ error: "File upload failed" });
    }

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!uploadedFile) return res.status(400).json({ error: "No file uploaded" });

    try {
      // Read file as a base64 string
      const fileBuffer = fs.readFileSync(uploadedFile.filepath);
      const base64Image = fileBuffer.toString("base64");

      // Call OpenAI GPT-4 Vision API
      const response = await openai.images.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the company name and total amount from this invoice." },
              { type: "image_url", image_url: `data:image/png;base64,${base64Image}` }
            ],
          },
        ],
      });

      // Extract and format data
      const textResponse = response.data.choices[0].message.content;
      const vendorMatch = textResponse.match(/Company Name:\s*(.+)/i);
      const totalMatch = textResponse.match(/Total Amount:\s*\$?(\d+\.\d{2})/i);

      const extractedData = {
        vendor: vendorMatch ? vendorMatch[1] : "Unknown",
        total: totalMatch ? parseFloat(totalMatch[1]) : 0,
      };

      res.status(200).json(extractedData);
    } catch (error) {
      console.error("OpenAI Vision error:", error);
      res.status(500).json({ error: "Failed to process invoice" });
    }
  });
}
