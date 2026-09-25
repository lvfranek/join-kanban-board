export const environment = {
  production: false,
  provider: 'supabase' as 'supabase' | 'mariadb',
  apiUrl: 'http://127.0.0.1:8000/api',
  supabase: {
    url: 'https://YOUR-PROJECT.supabase.co',
    anonKey: 'YOUR-ANON-KEY',
  },
};
