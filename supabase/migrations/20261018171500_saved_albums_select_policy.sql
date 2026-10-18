-- Allow users to view albums that they have saved or favorited
DROP POLICY IF EXISTS "Saved albums are viewable by who saved them" ON albums;
CREATE POLICY "Saved albums are viewable by who saved them" 
  ON albums FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_saved_albums 
      WHERE user_saved_albums.album_id = albums.id 
        AND user_saved_albums.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Favorited albums are viewable by who favorited them" ON albums;
CREATE POLICY "Favorited albums are viewable by who favorited them" 
  ON albums FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_favorites 
      WHERE user_favorites.album_id = albums.id 
        AND user_favorites.user_id = auth.uid()
    )
  );
