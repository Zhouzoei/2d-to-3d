import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('缺少 Supabase 配置！请在 .env.local 文件中设置：')
  console.error('REACT_APP_SUPABASE_URL=your-project-url')
  console.error('REACT_APP_SUPABASE_ANON_KEY=your-anon-key')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

export default supabase
