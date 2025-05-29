import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  supabase : SupabaseClient<any, "public", any>;
  constructor() 
  {
    this.supabase = createClient("https://lzjhqkzkhkgvheqkqukn.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6amhxa3praGtndmhlcWtxdWtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0ODQ3MjEsImV4cCI6MjA2NDA2MDcyMX0.JhhIymz2D9Y63xpA6mpJzVYL-LaS100n5oBsk2cZAgI");
  }

}
