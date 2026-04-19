import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `You are MyMechanic, an expert automotive technician. Generate detailed, safe, accurate DIY repair/install/modification guides for the user's specific vehicle. Always return JSON via the provided tool. Be precise about torque specs, safety warnings, and shop cost estimates in USD. Time estimates should be realistic for an intermediate DIYer.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { vehicle, task } = await req.json();
    if (!vehicle?.year || !vehicle?.make || !vehicle?.model || !task) {
      return new Response(JSON.stringify({ error: "Missing vehicle or task" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userPrompt = `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}\nTask: ${task}\n\nGenerate a complete DIY guide.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "build_guide",
              description: "Return a structured DIY guide.",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  difficulty: { type: "string", enum: ["Easy", "Moderate", "Hard", "Expert"] },
                  time_estimate: { type: "string", description: "e.g. 45 minutes, 2-3 hours" },
                  shop_cost_usd: { type: "string", description: "e.g. $180-$320" },
                  diy_cost_usd: { type: "string", description: "Estimated parts cost only" },
                  savings_usd: { type: "string" },
                  tools_needed: { type: "array", items: { type: "string" } },
                  parts_needed: { type: "array", items: { type: "string" } },
                  safety_warnings: { type: "array", items: { type: "string" } },
                  steps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        details: { type: "array", items: { type: "string" } },
                        tip: { type: "string" },
                      },
                      required: ["title", "details"],
                      additionalProperties: false,
                    },
                  },
                },
                required: [
                  "title",
                  "difficulty",
                  "time_estimate",
                  "shop_cost_usd",
                  "diy_cost_usd",
                  "savings_usd",
                  "tools_needed",
                  "parts_needed",
                  "safety_warnings",
                  "steps",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "build_guide" } },
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
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments;
    const guide = args ? JSON.parse(args) : null;
    if (!guide) throw new Error("No guide returned");

    return new Response(JSON.stringify({ guide }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("vehicle-guide error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
