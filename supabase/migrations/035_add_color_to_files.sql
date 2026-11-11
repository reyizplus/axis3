-- Add color field to files table
-- This allows users to select a color when uploading a file

ALTER TABLE files ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT 'Natural';

-- Update existing files to have default color
UPDATE files SET color = 'Natural' WHERE color IS NULL;

-- Add comment
COMMENT ON COLUMN files.color IS 'Selected print color for the 3D model';
