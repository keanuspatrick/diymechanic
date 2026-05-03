import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { kind, dataUrl, mimeType, vehicle } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!dataUrl || (kind !== "sound" && kind !== "photo")) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vehicleLine = vehicle?.year
      ? `The user is working on a ${vehicle.year} ${vehicle.make} ${vehicle.model}.`
      : "The user has not selected a vehicle yet.";

    let system = "";
    let userContent: any[] = [];

    if (kind === "sound") {
      system = `You are DIYMechanic, an expert automotive diagnostic assistant. ${vehicleLine}
The user recorded a sound their vehicle is making. Listen carefully and:
1. Describe what the sound is (knocking, squealing, grinding, hissing, ticking, whining, clunking, etc.).
2. List the most likely causes, ranked by probability.
3. Note urgency / safety concerns ("safe to drive" vs "stop driving").
4. Suggest the next diagnostic steps the DIYer can take.
Be concise, use bullet points, and flag if the recording is too quiet or unclear to diagnose.`;

      // Strip "data:audio/webm;base64," prefix
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      const fmt = (mimeType || "audio/webm").split("/")[1]?.split(";")[0] || "webm";

      userContent = [
        { type: "text", text: "Here's the sound my car is making. What is it and what should I check?" },
        { type: "input_audio", input_audio: { data: base64, format: fmt } },
      ];
    } else {
      system = `You are DIYMechanic, an expert automotive parts identifier. ${vehicleLine}
The user took a photo of a part on their vehicle. Your job is to:
1. Identify the part by its proper name (and common alternate names).
2. Explain what it does in 1–2 sentences.
3. Note typical signs of failure for this part.
4. Suggest what the user might want to do next (inspect, replace, torque spec, etc.).
Be concise. If the photo is unclear or doesn't show a vehicle part, say so.`;

      userContent = [
        { type: "text", text: "What part is this on my car?" },
        { type: "image_url", image_url: { url: dataUrl } },
      ];
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429)
        return new Response(JSON.stringify({ error: "Rate limit reached, try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (resp.status === 402)
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds to your Lovable workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      const t = await resp.text();
      console.error("AI error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content ?? "No response.";
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("vehicle-analyze error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
