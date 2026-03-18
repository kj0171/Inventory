# Inventory Management Dashboard

A professional inventory tracking application built with Next.js and Supabase.

## 🚀 Features

- 📊 Professional dashboard with real-time statistics
- 🔍 Advanced filtering and search capabilities
- 📅 Age-based inventory filtering (find old stock)
- 📤 CSV export functionality
- 📱 Fully responsive design
- 🎨 Modern gradient UI with professional styling

## 🔧 Environment Variables

**IMPORTANT**: Before deploying, create a `.env.local` file with your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

⚠️ **Security Note**: Never commit `.env.local` to Git - it's already in `.gitignore`

## 📦 Quick Start

```bash
# Install dependencies
npm install

# Add your Supabase credentials to .env.local

# Start development server
npm run dev

# Build for production
npm run build
```

## 🚀 Deploy to Vercel

1. Push your code to GitHub (credentials will be excluded automatically)
2. Connect your GitHub repo to Vercel
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

## 📊 Database Schema

Required Supabase tables:
```sql
-- Items table
inventory_items (
  id: uuid PRIMARY KEY,
  name: text,
  item_category: text
)

-- Stock levels table
inventory_stock (
  id: uuid PRIMARY KEY,
  quantity: integer,
  created_at: timestamptz,
  inventory_item_id: uuid REFERENCES inventory_items(id)
)
```

## 🛠 Tech Stack

- **Frontend**: Next.js 16, React 19
- **Database**: Supabase
- **Styling**: Custom CSS (TailwindCSS disabled due to native binding issues)
- **Deployment**: Vercel-ready

## 📱 Usage

- **Search**: Find items by name instantly
- **Filter by Category**: Dynamically populated dropdown
- **Stock Levels**: View Low/Medium/High stock alerts  
- **Age Filter**: Find inventory older than 15, 30, 60, 90, or 120 days
- **Sort**: By name, category, quantity, or date
- **Export**: Download filtered results as CSV

Built with ❤️ for professional inventory management
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
