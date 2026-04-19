import { defineConfig } from 'drizzle-kit';
import 'dotenv/config'; 

export default defineConfig({
  schema: './src/db/skema.ts', 
  out: './drizzle',             
  dialect: 'postgresql',        
  dbCredentials: {
    url: process.env.DATABASE_URL!, //mengambil URL koneksi database dari file .env
  },
  verbose: true, 
  strict: true,  
});