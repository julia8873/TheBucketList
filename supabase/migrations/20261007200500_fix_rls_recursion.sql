-- Create a security definer function to check album ownership without triggering RLS
CREATE OR REPLACE FUNCTION auth_is_album_owner(album_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM albums 
    WHERE id = album_uuid AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop recursive policies
DROP POLICY IF EXISTS "Album members readable by album owner or members" ON album_members;
DROP POLICY IF EXISTS "Album members insertable by album owner" ON album_members;
DROP POLICY IF EXISTS "Album members deletable by owner or user" ON album_members;

-- Recreate policies using the SECURITY DEFINER function
CREATE POLICY "Album members readable by album owner or members" ON album_members FOR SELECT USING (
  auth_is_album_owner(album_id) OR
  user_id = auth.uid()
);

CREATE POLICY "Album members insertable by album owner" ON album_members FOR INSERT WITH CHECK (
  auth_is_album_owner(album_id)
);

CREATE POLICY "Album members deletable by owner or user" ON album_members FOR DELETE USING (
  auth_is_album_owner(album_id) OR
  user_id = auth.uid()
);
