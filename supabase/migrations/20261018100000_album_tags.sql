-- Migration: Add album_tags table to associate tags with albums
CREATE TABLE IF NOT EXISTS public.album_tags (
    album_id uuid REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    tag_id uuid REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (album_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_album_tags_album_id ON public.album_tags(album_id);
CREATE INDEX IF NOT EXISTS idx_album_tags_tag_id ON public.album_tags(tag_id);

-- Enable RLS
ALTER TABLE public.album_tags ENABLE ROW LEVEL SECURITY;

-- Policies for album_tags
CREATE POLICY "Users can view album_tags" ON public.album_tags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.albums
            WHERE albums.id = album_tags.album_id
            AND (
                albums.owner_id = auth.uid()
                OR albums.visibility = 'public'
                OR EXISTS (
                    SELECT 1 FROM public.album_members
                    WHERE album_members.album_id = albums.id
                    AND album_members.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Album owners and members can insert album_tags" ON public.album_tags
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.albums
            WHERE albums.id = album_tags.album_id
            AND (
                albums.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.album_members
                    WHERE album_members.album_id = albums.id
                    AND album_members.user_id = auth.uid()
                    AND album_members.status = 'accepted'
                )
            )
        )
    );

CREATE POLICY "Album owners and members can delete album_tags" ON public.album_tags
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.albums
            WHERE albums.id = album_tags.album_id
            AND (
                albums.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.album_members
                    WHERE album_members.album_id = albums.id
                    AND album_members.user_id = auth.uid()
                    AND album_members.status = 'accepted'
                )
            )
        )
    );
