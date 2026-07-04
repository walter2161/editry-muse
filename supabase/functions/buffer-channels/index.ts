// Lists Buffer channels for the authenticated Buffer account.
// The account/organization channel fields are FORBIDDEN for Public API tokens,
// so we use the top-level `channels(input: { organizationId })` query per org.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BUFFER_API = "https://api.buffer.com";

const QUERY_ORGS = `
  query Orgs {
    account {
      id
      organizations { id name }
    }
  }
`;

const QUERY_CHANNELS = `
  query OrgChannels($id: OrganizationId!) {
    channels(input: { organizationId: $id }) {
      id
      name
      service
      avatar
      timezone
    }
  }
`;

async function bufferFetch(apiKey: string, query: string, variables?: Record<string, unknown>) {
  const res = await fetch(`${BUFFER_API}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

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

    const channelsMap = new Map<string, any>();
    const errors: unknown[] = [];

    const orgsRes = await bufferFetch(apiKey, QUERY_ORGS);
    if (orgsRes.data?.errors) errors.push(orgsRes.data.errors);
    const orgs: Array<{ id: string; name: string }> =
      orgsRes.data?.data?.account?.organizations ?? [];

    for (const org of orgs) {
      const res = await bufferFetch(apiKey, QUERY_CHANNELS, { id: org.id });
      if (res.data?.errors) {
        const nonForbidden = res.data.errors.filter(
          (e: any) => e?.extensions?.code !== "FORBIDDEN",
        );
        if (nonForbidden.length) errors.push(nonForbidden);
        continue;
      }
      for (const c of res.data?.data?.channels ?? []) {
        channelsMap.set(c.id, {
          ...c,
          organizationId: org.id,
          organizationName: org.name,
        });
      }
    }

    if (channelsMap.size === 0 && errors.length) {
      console.error("Buffer channels errors:", JSON.stringify(errors));
      return new Response(
        JSON.stringify({ error: "Buffer API error", details: errors }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ channels: Array.from(channelsMap.values()) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
