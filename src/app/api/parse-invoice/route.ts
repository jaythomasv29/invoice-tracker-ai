import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import { OpenAI } from "openai";
export const config = { api: { bodyParser: false } };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const data = await req.formData();
  const file = data.get('file') as File;
  if (!file) {
    return new Response(JSON.stringify({ error: "No file uploaded" }), { status: 400 });
  }

  // Convert File to Buffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Save to temp file
  const tmpFilePath = `/tmp/${file.name}`;
  fs.writeFileSync(tmpFilePath, buffer);

  try {
    // Read file as base64
    const base64Image = buffer.toString("base64");

    // Call OpenAI GPT-4 Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this invoice and return the data in this exact JSON format:\n" +
                "{\n" +
                "  'vendor': 'Company Name',\n" +
                "  'items': [\n" +
                "    { 'description': 'item description', 'quantity': number, 'unit_price': number, 'total': number }\n" +
                "  ],\n" +
                "  'total_amount': number\n" +
                "}"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              }
            }
          ],
        },
      ],
      max_tokens: 1000,
    });

    // Clean up temp file
    fs.unlinkSync(tmpFilePath);

    // Parse the response
    const textResponse = response.choices[0].message.content || '';

    try {
      // Clean up the response by removing markdown code block markers and any extra whitespace
      const cleanedResponse = textResponse
        .replace(/```json\n?/g, '')  // Remove ```json
        .replace(/```\n?/g, '')      // Remove closing ```
        .trim();                     // Remove extra whitespace

      // Try to parse the JSON response directly
      const parsedData = JSON.parse(cleanedResponse.replace(/'/g, '"'));
      return new Response(JSON.stringify(parsedData), { status: 200 });
    } catch (parseError) {
      console.error("Failed to parse response:", textResponse);
      return new Response(JSON.stringify({
        error: "Failed to parse invoice data",
        raw_response: textResponse
      }), { status: 500 });
    }

  } catch (error) {
    // Clean up temp file in case of error
    fs.unlinkSync(tmpFilePath);
    console.error("OpenAI Vision error:", error);
    return new Response(JSON.stringify({ error: "Failed to process invoice" }), { status: 500 });
  }
}
