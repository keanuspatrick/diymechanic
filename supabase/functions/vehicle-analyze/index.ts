import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Vehicle = { year?: string; make?: string; model?: string };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const mode: "photo" | "sound" = body.mode;
    const dataUrl: string = body.dataUrl;
    const vehicle: Vehicle = body.vehicle || {};

    if (!dataUrl || (mode !== "photo" && mode !== "sound")) {
      return new Response(JSON.stringify({ error: "Missing mode or dataUrl" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const vehicleLine = vehicle?.year
      ? `The user is working on a ${vehicle.year} ${vehicle.make} ${vehicle.model}.`
      : "The user has not selected a vehicle yet.";

    const system =
      mode === "photo"
        ? `You are DIYMechanic vision. ${vehicleLine}
You ONLY identify automotive parts on this exact vehicle. If the photo clearly is not a vehicle part, reply: "That doesn't look like a vehicle part — try again with the part centered in frame."
Otherwise return:
- **Part name** (specific: e.g. "Front passenger CV axle")
- **Where it lives** (1 sentence)
- **What it does** (1 sentence)
- **Common failure signs** (2-3 bullets)
- **Approximate replacement cost** for this vehicle (DIY vs shop)
Be vehicle-specific. Do not give generic advice.`
        : `You are DIYMechanic ear. ${vehicleLine}
You diagnose vehicle sounds. If the audio is clearly not a vehicle sound, reply: "I can't hear a vehicle sound — try recording closer with the engine running."
Otherwise return:
- **What I hear** (1 sentence describing the sound)
- **Most likely causes** (top 2-3, ranked by probability for this vehicle)
- **Quick check you can do now**
- **Safety note** (only if relevant)
- **Estimated repair cost** (DIY vs shop) for this vehicle`;

    const userContent: any[] =
      mode === "photo"
        ? [
            { type: "text", text: "Identify this part on my vehicle." },
            { type: "image_url", image_url: { url: dataUrl } },
          ]
        : [
            { type: "text", text: "Diagnose this vehicle sound." },
            { type: "input_audio", input_audio: { data: dataUrl.split(",")[1] || dataUrl, format: "webm" } },
          ];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      const t = await resp.text();
      console.error("AI error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content || "No response.";
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
