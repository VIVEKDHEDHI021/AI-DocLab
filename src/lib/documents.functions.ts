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
  .inputValidator((d) => z.object({ documentId: z.string().uuid() }).parse(d))
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
      // Fetch file content
      const { data: fileBlob, error: dlErr } = await supabase.storage
        .from("documents")
        .download(doc.file_path);
      if (dlErr || !fileBlob) throw new Error("Could not download file");

      const fileType = (doc.file_type || "").toLowerCase();
      const isImage = fileType.startsWith("image/");
      const isText =
        fileType.startsWith("text/") ||
        fileType.includes("json") ||
        fileType.includes("csv") ||
        fileType.includes("markdown") ||
        /\.(txt|md|csv|json|log)$/i.test(doc.file_name);

      let userContent: any[] = [];
      const baseInstruction = `You are an AI document analyst. Analyze the document and produce: (1) a clear short title, (2) a concise 2-3 sentence summary, (3) the most fitting category from this list: ${CATEGORIES.join(", ")}, and (4) 3-6 lowercase tags. Be specific and accurate.`;

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
                  title: { type: "string", description: "Short descriptive title (max 80 chars)." },
                  summary: { type: "string", description: "2-3 sentence summary." },
                  category: { type: "string", enum: CATEGORIES as unknown as string[] },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 2,
                    maxItems: 6,
                  },
                },
                required: ["title", "summary", "category", "tags"],
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
      };

      const safeCategory = (CATEGORIES as readonly string[]).includes(parsed.category)
        ? parsed.category
        : "Other";

      await supabase
        .from("documents")
        .update({
          title: parsed.title.slice(0, 200),
          summary: parsed.summary,
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
