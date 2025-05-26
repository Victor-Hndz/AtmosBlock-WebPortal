-- Create enum type for user roles if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'user');
    END IF;
END
$$;

-- Create enum type for user status if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
        CREATE TYPE request_status AS ENUM ('cached', 'generating', 'expired', 'empty');
    END IF;
END
$$;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create generated_files table
CREATE TABLE IF NOT EXISTS generated_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_hash TEXT NOT NULL UNIQUE,
  files TEXT[] NOT NULL,  -- MinIO object keys
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create requests table
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_hash TEXT NOT NULL,
  request_status request_status NOT NULL DEFAULT 'empty',
  variable_name VARCHAR(100) NOT NULL,
  pressure_levels TEXT[] NOT NULL,
  years_selected TEXT[] NOT NULL,
  months_selected TEXT[] NOT NULL,
  days_selected TEXT[] NOT NULL,
  hours_selected TEXT[] NOT NULL,
  area_covered TEXT[] NOT NULL,
  map_types TEXT[] NOT NULL,
  map_levels TEXT[] NOT NULL,
  file_format_selected VARCHAR(50) DEFAULT 'SVG',
  no_maps BOOLEAN DEFAULT FALSE,
  no_data BOOLEAN DEFAULT FALSE,
  omp BOOLEAN DEFAULT FALSE,
  mpi BOOLEAN DEFAULT FALSE,
  n_threads INTEGER,
  n_proces INTEGER,
  times_requested INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  generated_files_id UUID REFERENCES generated_files(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_requests_user_hash ON requests (user_id, request_hash);
CREATE INDEX IF NOT EXISTS idx_generated_files_hash ON generated_files (request_hash);

-- Create a user with admin role if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@admin.com') THEN
        INSERT INTO users (name, email, password, role)
        VALUES ('Admin', 'admin@admin.com', 'admin', 'admin');
    END IF;
END $$;