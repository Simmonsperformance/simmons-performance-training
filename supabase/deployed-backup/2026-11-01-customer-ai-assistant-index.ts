import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED = new Set([
  "https://simmonsperformance.github.io",
  ...(Deno.env.get("SPT_ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim()).filter(Boolean),
]);
const cors = (origin: string) => ({
  "Access-Control-Allow-Origin": ALLOWED.has(origin) ? origin : "null",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
});
const reply = (status: number, body: Record<string, unknown>, origin: string) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });

const SYSTEM_INSTRUCTIONS = `You are the friendly customer-support assistant for Simmons Performance Training (SPT), a small athletic performance and nutrition business. Answer the user's actual question naturally and helpfully, including general questions beyond SPT when appropriate. Be concise, clear, and honest. Do not claim to have performed actions, checked accounts, confirmed bookings, or accessed live data you cannot access.

Known SPT facts:
- Four downloadable nutrition PDF guides cost $30 each: Muscle-Building Nutrition Guide, Fat-Loss Nutrition Guide, Meal Prep & Grocery Guide, and Athlete Nutrition Guide.
- The separate Personalized Athlete Nutrition Guide costs $50. The customer completes an intake form; the coach verifies payment, prepares it manually, and emails it. It is not instant.
- Payment options listed by the website are Zelle and in-person/cash. Follow checkout instructions; do not claim payment is verified.
- Appointments are requests only until reviewed/approved and payment is verified. Do not claim live availability. The stated schedule is Monday–Saturday, 5 AM–9 PM Arizona time; Sunday closed; appointments are 90 minutes, start times in 30-minute intervals. Still direct customers to the website for actual available slots.
- For specific order, delivery, refund, booking, or account help, direct the customer to simmonsperftraining@gmail.com. Never ask for passwords or full payment-card details.
- You may provide general educational fitness and nutrition information, but do not diagnose, prescribe treatment, or replace a qualified healthcare professional or registered dietitian. For injuries, medical conditions, allergies, medication, or urgent symptoms, recommend appropriate professional care.
- Do not invent SPT products, prices, policies, links, availability, or promises. Clearly distinguish general information from confirmed SPT-specific facts.
- Protect privacy. Avoid requesting sensitive personal information.`;

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") || "";
  if (request.method === "OPTIONS") {
    if (!ALLOWED.has(origin)) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: cors(origin) });
  }
  if (request.method !== "POST" || !ALLOWED.has(origin)) {
    return reply(403, { error: "This request is not allowed from this website." }, origin);
  }
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return reply(400, { error: "Please send a valid chat message." }, origin); }
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  if (rawMessages.length < 1 || rawMessages.length > 12) return reply(400, { error: "Please send up to 12 recent chat messages." }, origin);
  const messages: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
  for (const item of rawMessages) {
    if (!item || typeof item !== "object") continue;
    const role = (item as Record<string, unknown>).role;
    const content = (item as Record<string, unknown>).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > 1200) continue;
    messages.push({ role: role === "assistant" ? "model" : "user", parts: [{ text: trimmed }] });
  }
  if (!messages.length || messages[messages.length - 1].role !== "user") return reply(400, { error: "Please enter a question first." }, origin);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return reply(503, { error: "The AI assistant is waiting for its free Gemini API key to be connected. Please email simmonsperftraining@gmail.com for help." }, origin);

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTIONS }] },
        contents: messages,
        generationConfig: { temperature: 0.5, maxOutputTokens: 700 }
      }),
      signal: AbortSignal.timeout(25000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Gemini API request failed", response.status, JSON.stringify(data).slice(0, 800));
      if (response.status === 429) return reply(429, { error: "The free AI usage limit has been reached for now. Please try again later, or email simmonsperftraining@gmail.com." }, origin);
      if (response.status === 400 || response.status === 403) return reply(502, { error: "The AI service rejected the request or API key. Please check the Gemini API key setup in Supabase." }, origin);
      return reply(502, { error: "The AI service is temporarily unavailable. Please try again shortly." }, origin);
    }
    const answer = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("").trim();
    if (!answer) return reply(502, { error: "The AI assistant could not produce an answer this time. Please try again." }, origin);
    return reply(200, { reply: answer }, origin);
  } catch (error) {
    console.error("Gemini request exception", error instanceof Error ? error.message : String(error));
    return reply(502, { error: "The AI service could not be reached. Please try again shortly." }, origin);
  }
});