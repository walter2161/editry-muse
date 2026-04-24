// Lists Buffer channels for the authenticated Buffer account
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BUFFER_API = "https://api.buffer.com";

const QUERY = `
  query Channels {
    account {
      organizations {
        id
        name
        channels {
          id
          name
          service
          serviceUsername
          avatar
        }
      }
    }
  }
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("BUFFER_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "BUFFER_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const res = await fetch(BUFFER_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query: QUERY }),
    });

    const data = await res.json();
    if (!res.ok || data.errors) {
      console.error("Buffer error:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Buffer API error", details: data }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const orgs = data?.data?.account?.organizations ?? [];
    const channels = orgs.flatMap((o: any) =>
      (o.channels ?? []).map((c: any) => ({
        ...c,
        organizationId: o.id,
        organizationName: o.name,
      })),
    );

    return new Response(JSON.stringify({ channels }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
