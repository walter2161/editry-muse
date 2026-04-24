
-- Public bucket for rendered videos uploaded for Buffer scheduling
INSERT INTO storage.buckets (id, name, public)
VALUES ('rendered-videos', 'rendered-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read (Buffer needs public URL)
CREATE POLICY "Public read rendered videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'rendered-videos');

-- Anyone can upload (no auth in this app yet)
CREATE POLICY "Anyone can upload rendered videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'rendered-videos');
