-- Create enum type for user roles if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'user');
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
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger to update 'updated_at' automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create requests table
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variable_name VARCHAR(100) NOT NULL,
  pressure_levels TEXT[] NOT NULL,
  years_selected TEXT[] NOT NULL,
  months_selected TEXT[] NOT NULL,
  days_selected TEXT[] NOT NULL,
  hours_selected TEXT[] NOT NULL,
  area_covered TEXT[] NOT NULL,
  map_ranges TEXT[] NOT NULL,
  map_types TEXT[] NOT NULL,
  map_levels TEXT[] NOT NULL,
  file_format_selected VARCHAR(50) DEFAULT 'SVG',
  tracking BOOLEAN DEFAULT FALSE,
  debug BOOLEAN DEFAULT FALSE,
  no_compile BOOLEAN DEFAULT FALSE,
  no_execute BOOLEAN DEFAULT FALSE,
  no_maps BOOLEAN DEFAULT FALSE,
  animation BOOLEAN DEFAULT FALSE,
  omp BOOLEAN DEFAULT FALSE,
  mpi BOOLEAN DEFAULT FALSE,
  n_threads INTEGER,
  n_proces INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS update_requests_updated_at ON requests;
CREATE TRIGGER update_requests_updated_at
BEFORE UPDATE ON requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
