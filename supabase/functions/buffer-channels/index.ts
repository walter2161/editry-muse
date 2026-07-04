// Lists Buffer channels for the authenticated Buffer account.
// Some tokens don't have access to `account.organizations[].channels` (FORBIDDEN),
// so we fall back to `account.currentOrganization.channels` and then to a
// per-organization query, skipping orgs the token can't read.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BUFFER_API = "https://api.buffer.com";

const QUERY_CURRENT = `
  query CurrentOrgChannels {
    account {
      currentOrganization {
        id
        name
        channels {
          id
          name
          service
          avatar
          timezone
        }
      }
      organizations {
        id
        name
      }
    }
  }
`;

const QUERY_ORG_CHANNELS = `
  query OrgChannels($id: String!) {
    organization(id: $id) {
      id
      name
      channels {
        id
        name
        service
        avatar
        timezone
      }
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

    // 1) Try the safer currentOrganization query + list of orgs (no channels field on orgs list)
    const first = await bufferFetch(apiKey, QUERY_CURRENT);
    const currentOrg = first.data?.data?.account?.currentOrganization;
    const orgs: Array<{ id: string; name: string }> = first.data?.data?.account?.organizations ?? [];
    if (first.data?.errors) errors.push(first.data.errors);

    if (currentOrg?.channels) {
      for (const c of currentOrg.channels) {
        channelsMap.set(c.id, {
          ...c,
          organizationId: currentOrg.id,
          organizationName: currentOrg.name,
        });
      }
    }

    // 2) Try each additional organization individually — skip FORBIDDEN silently
    for (const org of orgs) {
      if (currentOrg && org.id === currentOrg.id) continue;
      const res = await bufferFetch(apiKey, QUERY_ORG_CHANNELS, { id: org.id });
      const orgData = res.data?.data?.organization;
      if (res.data?.errors) {
        // Ignore FORBIDDEN per-org errors, keep others for debugging
        const nonForbidden = res.data.errors.filter(
          (e: any) => e?.extensions?.code !== "FORBIDDEN",
        );
        if (nonForbidden.length) errors.push(nonForbidden);
        continue;
      }
      for (const c of orgData?.channels ?? []) {
        channelsMap.set(c.id, {
          ...c,
          organizationId: orgData.id,
          organizationName: orgData.name,
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
