CREATE TABLE IF NOT EXISTS public.tags (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    color text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX tags_user_id_lower_name_idx ON public.tags (user_id, lower(name));

CREATE TABLE IF NOT EXISTS public.item_tags (
    item_id uuid REFERENCES public.buckets(id) ON DELETE CASCADE NOT NULL,
    tag_id uuid REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (item_id, tag_id)
);

-- RLS para tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tags" ON public.tags
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags" ON public.tags
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags" ON public.tags
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags" ON public.tags
    FOR DELETE USING (auth.uid() = user_id);

-- RLS para item_tags (asume que los buckets pertenecen al usuario)
ALTER TABLE public.item_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their item_tags" ON public.item_tags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.buckets
            WHERE buckets.id = item_tags.item_id AND buckets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their item_tags" ON public.item_tags
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.buckets
            WHERE buckets.id = item_tags.item_id AND buckets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their item_tags" ON public.item_tags
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.buckets
            WHERE buckets.id = item_tags.item_id AND buckets.user_id = auth.uid()
        )
    );
