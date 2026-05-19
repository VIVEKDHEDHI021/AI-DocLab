import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CATEGORIES = [
  "Finance",
  "Legal",
  "Personal ID",
  "Receipts",
  "Medical",
  "Education",
  "Work",
  "Research",
  "Travel",
  "Other",
] as const;

async function callAI(messages: any[], tools?: any[], tool_choice?: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing from .env");
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      messages,
      ...(tools ? { tools, tool_choice } : {}),
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 429) throw new Error("AI rate limit hit. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace settings.");
    throw new Error(`AI error ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

export const processDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        documentId: z.string().uuid(),
        googleAccessToken: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: doc, error: fetchErr } = await supabase
      .from("documents")
      .select("*")
      .eq("id", data.documentId)
      .eq("user_id", userId)
      .single();
    if (fetchErr || !doc) throw new Error("Document not found");

    await supabase
      .from("documents")
      .update({ status: "processing", error_message: null })
      .eq("id", doc.id);

    try {
      let fileBlob: Blob;

      if (doc.drive_file_id) {
        if (!data.googleAccessToken) {
          throw new Error("Google access token required to process Drive file");
        }
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${doc.drive_file_id}?alt=media`,
          {
            headers: {
              Authorization: `Bearer ${data.googleAccessToken}`,
            },
          },
        );
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Failed to download from Google Drive: ${response.statusText} (${errText})`);
        }
        fileBlob = await response.blob();
      } else {
        if (!doc.file_path) throw new Error("Document has no file path");
        const { data: dlBlob, error: dlErr } = await supabase.storage
          .from("documents")
          .download(doc.file_path);
        if (dlErr || !dlBlob) throw new Error("Could not download file from storage");
        fileBlob = dlBlob;
      }

      const fileType = (doc.file_type || "").toLowerCase();
      const isImage = fileType.startsWith("image/");
      const isText =
        fileType.startsWith("text/") ||
        fileType.includes("json") ||
        fileType.includes("csv") ||
        fileType.includes("markdown") ||
        /\.(txt|md|csv|json|log)$/i.test(doc.file_name);

      let userContent: any[] = [];
      const baseInstruction = `You are an AI document analyst. Analyze the document and produce: (1) a clear short title, (2) a concise 2-3 sentence summary, (3) the most fitting category from this list: ${CATEGORIES.join(", ")}, and (4) 3-6 lowercase tags. Be specific and accurate.

TITLE FORMATTING RULE FOR PERSONAL DOCUMENTS:
If this document is a personal document (such as a personal ID, certificate, card, or account document belonging to a specific individual, e.g. Aadhar, PAN, passport, mark sheet, bank passbook), you MUST identify the person's name (e.g., Vivek) and the type of document (e.g., Aadhar). 
Format the title using lowercase kebab-case as "personname-documentname" (for example, "vivek-aadhar", "vivek-pan", "smit-marksheet"). If the individual's name is not found, default to a standard short descriptive title.

Additionally, you MUST look for and extract any of the following if present in the document:
- Aadhar Card Numbers (12-digit number, often formatted as XXXX XXXX XXXX or XXXX-XXXX-XXXX)
- PAN Card Numbers (10-character alphanumeric, often formatted as 5 letters, 4 digits, 1 letter, e.g., ABCDE1234F)
- Bank Account Numbers and IFC/routing codes.
If any of these are found, extract and format them clearly (e.g. "Aadhar Card: 1234 5678 9012" or "PAN Card: ABCDE1234F").`;

      if (isText) {
        const textRaw = await fileBlob.text();
        const text = textRaw.slice(0, 12000);
        userContent = [
          { type: "text", text: `Filename: ${doc.file_name}\n\n--- DOCUMENT CONTENT ---\n${text}` },
        ];
      } else if (isImage && fileBlob.size < 5_000_000) {
        const buf = await fileBlob.arrayBuffer();
        const b64 = Buffer.from(buf).toString("base64");
        userContent = [
          { type: "text", text: `Filename: ${doc.file_name}\n\nAnalyze the document image below.` },
          { type: "image_url", image_url: { url: `data:${doc.file_type};base64,${b64}` } },
        ];
      } else {
        // Fallback: filename-only inference (PDFs, large files, etc.)
        userContent = [
          {
            type: "text",
            text: `I cannot read the binary contents directly. Based ONLY on the filename and file type below, infer the most likely category, give a generic descriptive title, and write a short summary noting this is filename-based inference.\n\nFilename: ${doc.file_name}\nType: ${doc.file_type}\nSize: ${doc.file_size} bytes`,
          },
        ];
      }

      const result = await callAI(
        [
          { role: "system", content: baseInstruction },
          { role: "user", content: userContent },
        ],
        [
          {
            type: "function",
            function: {
              name: "save_analysis",
              description: "Save the analysis of the document.",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Short descriptive title (max 80 chars). Use the lowercase kebab-case format 'name-doctype' for personal documents if a person name is identified." },
                  summary: { type: "string", description: "2-3 sentence summary." },
                  category: { type: "string", enum: CATEGORIES as unknown as string[] },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 2,
                    maxItems: 6,
                  },
                  extracted_numbers: {
                    type: "array",
                    description: "Any extracted identity numbers like Aadhar, PAN, or Bank Account numbers. Leave empty if none found.",
                    items: { type: "string" },
                  },
                },
                required: ["title", "summary", "category", "tags", "extracted_numbers"],
                additionalProperties: false,
              },
            },
          },
        ],
        { type: "function", function: { name: "save_analysis" } },
      );

      const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("AI did not return analysis");
      const parsed = JSON.parse(toolCall.function.arguments) as {
        title: string;
        summary: string;
        category: string;
        tags: string[];
        extracted_numbers?: string[];
      };

      const safeCategory = (CATEGORIES as readonly string[]).includes(parsed.category)
        ? parsed.category
        : "Other";

      let finalSummary = parsed.summary;
      if (parsed.extracted_numbers && parsed.extracted_numbers.length > 0) {
        finalSummary += "\n\nExtracted Details:\n" + parsed.extracted_numbers.map(n => `• ${n}`).join("\n");
      }

      await supabase
        .from("documents")
        .update({
          title: parsed.title.slice(0, 200),
          summary: finalSummary,
          category: safeCategory,
          tags: parsed.tags.map((t) => t.toLowerCase()).slice(0, 6),
          status: "ready",
        })
        .eq("id", doc.id);

      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await supabase
        .from("documents")
        .update({ status: "error", error_message: message })
        .eq("id", doc.id);
      throw err;
    }
  });

export const askVault = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ question: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { question } = data;

    const { data: docs, error } = await supabase
      .from("documents")
      .select("title, category, summary, tags")
      .eq("user_id", userId)
      .eq("status", "ready");

    if (error) throw new Error("Could not retrieve documents");

    if (!docs || docs.length === 0) {
      return { answer: "You don't have any documents in your Vault yet. Please upload some documents first so I can help answer your questions!" };
    }

    const docsContext = docs.map(d => {
      return `Document Title: ${d.title}\nCategory: ${d.category}\nSummary: ${d.summary}\nTags: ${d.tags.join(", ")}`;
    }).join("\n\n---\n\n");

    const systemInstruction = `You are "Vault AI", the user's personal secure document assistant. You have secure access to the user's documents summarized below. 
Your task is to answer the user's question accurately based ONLY on the provided document summaries.
If the user asks for a document number (like Aadhar, PAN, or Bank Account), look closely at the document summaries (the user has specifically had these extracted into the summaries under "Extracted Details").
Be extremely direct, concise, and helpful. If the user asks for a number, give them the exact number immediately.
If the answer cannot be found in the document summaries, politely inform them of that fact (e.g. "I couldn't find that details in your current Vault documents.").

--- USER'S DOCUMENTS CONTEXT ---
${docsContext}
`;

    const result = await callAI([
      { role: "system", content: systemInstruction },
      { role: "user", content: question }
    ]);

    const answer = result.choices?.[0]?.message?.content || "Sorry, I couldn't generate an answer.";
    return { answer };
  });
