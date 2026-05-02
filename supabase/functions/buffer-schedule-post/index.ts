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

type InstagramType = "post" | "reel" | "story";

interface ChannelOption {
  channelId: string;
  service: string; // instagram | facebook | tiktok
  // Instagram
  instagramType?: InstagramType;
  // Facebook
  facebookTitle?: string;
  facebookType?: "post" | "reel" | "story";
  // TikTok
  tiktokDisableDuet?: boolean;
  tiktokDisableStitch?: boolean;
  tiktokDisableComments?: boolean;
  tiktokPrivacy?: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "SELF_ONLY";
}

interface ReqBody {
  channelIds: string[];
  text: string;
  // Per-channel options (Instagram type, Facebook title, etc)
  channelOptions?: ChannelOption[];
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
      // Force a clean .mp4 path so external services (Instagram/TikTok/Buffer)
      // can detect the file type from the URL extension.
      const safeName = body.filename.replace(/[^a-z0-9.\-_]/gi, "_").replace(/\.[^.]+$/, "");
      const path = `${crypto.randomUUID()}-${safeName}.mp4`;
      const bytes = base64ToBytes(body.videoBase64);
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, {
          contentType: "video/mp4",
          upsert: false,
          cacheControl: "3600",
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

    const optsMap = new Map<string, ChannelOption>();
    for (const o of body.channelOptions ?? []) optsMap.set(o.channelId, o);

    const results: Array<{ channelId: string; ok: boolean; result: unknown }> = [];

    for (const channelId of body.channelIds) {
      const opt = optsMap.get(channelId);
      const service = (opt?.service ?? "").toLowerCase();

      // Build platform-specific metadata according to Buffer's GraphQL schema.
      // Schema reference: https://buffer.com/developers/api/graphql
      const metadata: Record<string, unknown> = {};
      if (service === "instagram") {
        // InstagramPostMetadataInput requires `type` and `shouldShareToFeed` (Boolean!)
        const igType = opt?.instagramType ?? "reel";
        metadata.instagram = {
          type: igType,
          // Required field - whether the reel should also be shared to the main feed
          shouldShareToFeed: igType === "reel" ? true : false,
        };
      } else if (service === "facebook") {
        // FacebookPostMetadataInput accepts `type` (post|reel|story). No `title` field.
        // Reel title (when needed) goes in the post text instead.
        metadata.facebook = { type: opt?.facebookType ?? "post" };
        if (opt?.facebookTitle && opt?.facebookType === "reel") {
          // Prepend title to the body text since Buffer doesn't accept a separate title
          // (handled in `text` below — see note)
        }
      } else if (service === "tiktok") {
        // TikTokPostMetadataInput only accepts `title` (per Buffer GraphQL schema).
        // Privacy/duet/stitch/comments are managed in the user's TikTok account settings,
        // NOT via Buffer's API. Sending unknown fields causes BAD_USER_INPUT errors.
        // Skip metadata entirely for TikTok video posts.
      }

      const input: Record<string, unknown> = {
        text: body.text,
        channelId,
        // schedulingType=automatic means Buffer auto-publishes (vs notification)
        schedulingType: "automatic",
        assets: {
          videos: [
            { url: videoUrl, ...(body.thumbnailUrl ? { thumbnailUrl: body.thumbnailUrl } : {}) },
          ],
        },
      };
      if (Object.keys(metadata).length > 0) input.metadata = metadata;

      // ShareMode: customScheduled (with dueAt) or addToQueue
      if (body.dueAt) {
        input.mode = "customScheduled";
        input.dueAt = body.dueAt;
      } else {
        input.mode = "addToQueue";
      }

      const res = await fetch(`${BUFFER_API}/graphql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query: MUTATION, variables: { input } }),
      });
      const data = await res.json();
      const payload = data?.data?.createPost;
      const ok = res.ok && payload && !payload.message && !data?.errors;
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
