import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are the official AI assistant for the Prosperity Party — Adama City Branch (Paartii Badhaadhinaa Magaalaa Adaamaa), in Adama, Oromia, Ethiopia.

Your role:
- Be an expert on the Prosperity Party (PP) and specifically its Adama City branch: mission, values, organizational structure (city → sub-city → woreda), leadership, policies, programs, community outreach, member services, and the workflows used by this Document Management System (DMS).
- Help members, officers, and the public navigate the system: uploading documents, browsing categories, subcities, woredas, user roles, audit logs, etc.
- Answer questions about specific documents, statistics, and organizational structure using the LIVE SYSTEM CONTEXT provided to you in a separate system message. Quote document titles, descriptions, document numbers, dates, and tags directly from that context when relevant.
- Respond in the same language the user writes in. Support Afaan Oromoo, Amharic (አማርኛ), and English fluently. Default to English if the language is unclear.
- Be respectful, professional, concise, and politically neutral.
- Never reveal information about Restricted, Confidential, or Top Secret documents — the system context only contains documents marked Public or Internal.
- If the answer is not in the system context and you are not certain, say so honestly and suggest the user check the relevant page of the DMS or contact the branch office.

Format answers in clear Markdown with short paragraphs and bullet points. When quoting document data, include the document title and, when available, the document number and date.`;

function extractLastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const text = m.parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join(" ")
      .trim();
    if (text) return text;
  }
  return "";
}

function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 8);
}

async function buildSystemContext(userQuery: string): Promise<string> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [docCount, userCount, subcitiesRes, woredasRes, categoriesRes, recentDocsRes] =
      await Promise.all([
        supabaseAdmin.from("documents").select("*", { count: "exact", head: true }).eq("is_archived", false),
        supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("subcities").select("id,name").order("name"),
        supabaseAdmin.from("woredas").select("id,name,subcity_id").order("name"),
        supabaseAdmin.from("categories").select("id,name,description").order("name"),
        supabaseAdmin
          .from("documents")
          .select("title,document_number,description,tags,document_date,confidentiality_level,category_id,subcity_id,woreda_id,file_name,created_at")
          .in("confidentiality_level", ["Public", "Internal"])
          .eq("is_archived", false)
          .order("created_at", { ascending: false })
          .limit(15),
      ]);

    const subcities = (subcitiesRes.data ?? []) as Array<{ id: string; name: string }>;
    const woredas = (woredasRes.data ?? []) as Array<{ id: string; name: string; subcity_id: string }>;
    const categories = (categoriesRes.data ?? []) as Array<{ id: string; name: string; description: string | null }>;
    const subcityName = new Map(subcities.map((s) => [s.id, s.name]));
    const woredaName = new Map(woredas.map((w) => [w.id, w.name]));
    const categoryName = new Map(categories.map((c) => [c.id, c.name]));

    // Keyword search across visible documents
    const kws = keywords(userQuery);
    let searchHits: Array<Record<string, unknown>> = [];
    if (kws.length > 0) {
      const orFilters = kws
        .flatMap((w) => [
          `title.ilike.%${w}%`,
          `description.ilike.%${w}%`,
          `document_number.ilike.%${w}%`,
          `file_name.ilike.%${w}%`,
        ])
        .join(",");
      const { data } = await supabaseAdmin
        .from("documents")
        .select("title,document_number,description,tags,document_date,confidentiality_level,category_id,subcity_id,woreda_id,file_name,created_at")
        .in("confidentiality_level", ["Public", "Internal"])
        .eq("is_archived", false)
        .or(orFilters)
        .limit(8);
      searchHits = (data ?? []) as Array<Record<string, unknown>>;
    }

    const fmtDoc = (d: Record<string, any>) =>
      `- "${d.title}"${d.document_number ? ` (#${d.document_number})` : ""}` +
      `${d.document_date ? ` — ${d.document_date}` : ""}` +
      `${d.category_id && categoryName.get(d.category_id) ? ` · Category: ${categoryName.get(d.category_id)}` : ""}` +
      `${d.subcity_id && subcityName.get(d.subcity_id) ? ` · Subcity: ${subcityName.get(d.subcity_id)}` : ""}` +
      `${d.woreda_id && woredaName.get(d.woreda_id) ? ` · Woreda: ${woredaName.get(d.woreda_id)}` : ""}` +
      `${d.confidentiality_level ? ` · ${d.confidentiality_level}` : ""}` +
      `${Array.isArray(d.tags) && d.tags.length ? ` · Tags: ${d.tags.join(", ")}` : ""}` +
      `${d.description ? `\n  Excerpt: ${String(d.description).slice(0, 400)}` : ""}`;

    const recent = (recentDocsRes.data ?? []) as Array<Record<string, any>>;

    return [
      `LIVE SYSTEM CONTEXT (Adama City PP Document Management System)`,
      ``,
      `Statistics:`,
      `- Total active documents: ${docCount.count ?? 0}`,
      `- Total users: ${userCount.count ?? 0}`,
      `- Subcities: ${subcities.length}`,
      `- Woredas: ${woredas.length}`,
      `- Categories: ${categories.length}`,
      ``,
      `Subcities: ${subcities.map((s) => s.name).join(", ") || "(none)"}`,
      ``,
      `Woredas: ${woredas.map((w) => `${w.name}${subcityName.get(w.subcity_id) ? ` (${subcityName.get(w.subcity_id)})` : ""}`).join(", ") || "(none)"}`,
      ``,
      `Document categories:`,
      categories.map((c) => `- ${c.name}${c.description ? `: ${c.description}` : ""}`).join("\n") || "(none)",
      ``,
      searchHits.length > 0
        ? `Documents matching the user's question (keywords: ${kws.join(", ")}):\n${searchHits.map(fmtDoc).join("\n")}`
        : `No documents matched the user's keywords (${kws.join(", ") || "none"}).`,
      ``,
      `Most recent ${recent.length} Public/Internal documents:`,
      recent.map(fmtDoc).join("\n") || "(none)",
      ``,
      `Only the documents listed above are visible to you. Do NOT reference Restricted, Confidential, or Top Secret documents.`,
    ].join("\n");
  } catch (e) {
    console.error("buildSystemContext failed", e);
    return "LIVE SYSTEM CONTEXT unavailable for this request.";
  }
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const userQuery = extractLastUserText(messages);
        const liveContext = await buildSystemContext(userQuery);

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: `${SYSTEM_PROMPT}\n\n---\n${liveContext}`,
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
