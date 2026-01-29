# Supabase Setup Instructions

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: Sprint Skills Mentoring
   - **Database Password**: Choose a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"

## 2. Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings > API**
2. Copy these values:
   - **Project URL**: `https://your-project.supabase.co`
   - **anon/public key**: `eyJ...` (the anon key)

## 3. Set Up Environment Variables

1. Create a `.env` file in your project root:
```bash
cp .env.example .env
```

2. Edit `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## 4. Create Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the contents of `database/schema.sql`
4. Click "Run" to execute the schema

## 5. Verify Setup

1. Go to **Table Editor** in Supabase
2. You should see these tables:
   - `cohorts`
   - `mentees`
   - `mentors`
3. The `cohorts` table should have one sample row

## 6. Test the Connection

1. Start your development server:
```bash
npm run dev
```

2. Go to the Cohorts page
3. You should see the sample cohort "Q1 2025 Leadership Development"
4. Try creating a new cohort to test the connection

## 7. Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. In deployment settings, add these environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

## 8. Optional: Enable Real-time (Future)

For real-time features like live session updates:

1. In Supabase, go to **Database > Replication**
2. Enable replication for tables you want real-time updates on
3. In your code, use Supabase's real-time subscriptions

## Troubleshooting

### Connection Issues
- Check your environment variables are correct
- Ensure your Supabase project is not paused
- Check the browser console for network errors

### Permission Issues
- Verify Row Level Security policies are set correctly
- For development, you can temporarily disable RLS

### Database Issues
- Check the SQL Editor for syntax errors
- Use the Table Editor to verify data structure

## Security Notes

- Never commit your `.env` file to version control
- The anon key is safe for frontend use
- Consider enabling RLS policies for production
- Monitor usage in Supabase dashboard