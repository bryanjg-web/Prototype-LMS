# Add avatar_url column for profile photos

Run this SQL in your [Supabase SQL Editor](https://supabase.com/dashboard/project/ugjcugwawzmxuticqkgn/sql/new):

```sql
alter table public.user_profiles
  add column if not exists avatar_url text;

comment on column public.user_profiles.avatar_url is 'URL or path to profile photo (e.g. /avatars/name.png)';
```

Then run: `npm run seed:users`
