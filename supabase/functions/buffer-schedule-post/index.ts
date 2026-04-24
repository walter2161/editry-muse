// Schedules a video post on Buffer for one or more channels.
// Accepts a base64 video (or a public URL), uploads it to Storage if needed,
// then calls Buffer's GraphQL API to create the post for each channel.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BUFFER_API = "https://api.buffer.com";
const BUCKET = "rendered-videos";

interface ReqBody {
  channelIds: string[];
  text: string;
  // Either provide videoBase64 + filename, OR a public videoUrl
  videoBase64?: string;
  filename?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  // ISO datetime for scheduling. If omitted -> addToQueue
  dueAt?: string;
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.split(",")[1] : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const MUTATION = `
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      ... on PostActionSuccess {
        post { id text }
      }
      ... on MutationError {
        message
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

    const body = (await req.json()) as ReqBody;
    if (!body.channelIds?.length) {
      return new Response(JSON.stringify({ error: "channelIds required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!body.text) {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve public video URL
    let videoUrl = body.videoUrl;
    if (!videoUrl) {
      if (!body.videoBase64 || !body.filename) {
        return new Response(
          JSON.stringify({ error: "videoBase64+filename or videoUrl required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const path = `${crypto.randomUUID()}-${body.filename.replace(/[^a-z0-9.\-_]/gi, "_")}`;
      const bytes = base64ToBytes(body.videoBase64);
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, {
          contentType: "video/mp4",
          upsert: false,
        });
      if (upErr) {
        console.error("Upload error", upErr);
        return new Response(
          JSON.stringify({ error: "Failed to upload video", details: upErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      videoUrl = pub.publicUrl;
    }

    const results: Array<{ channelId: string; ok: boolean; result: unknown }> = [];

    for (const channelId of body.channelIds) {
      const input: Record<string, unknown> = {
        text: body.text,
        channelId,
        schedulingType: "automatic",
        assets: {
          videos: [
            { url: videoUrl, ...(body.thumbnailUrl ? { thumbnailUrl: body.thumbnailUrl } : {}) },
          ],
        },
      };
      if (body.dueAt) {
        input.mode = "customScheduled";
        input.dueAt = body.dueAt;
      } else {
        input.mode = "addToQueue";
      }

      const res = await fetch(BUFFER_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query: MUTATION, variables: { input } }),
      });
      const data = await res.json();
      const payload = data?.data?.createPost;
      const ok = res.ok && payload && !payload.message;
      if (!ok) console.error("Buffer post error", channelId, JSON.stringify(data));
      results.push({ channelId, ok, result: payload ?? data });
    }

    return new Response(JSON.stringify({ videoUrl, results }), {
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
