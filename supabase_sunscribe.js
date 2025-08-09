import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv';
dotenv.config();


// supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);



// const channels = supabase.channel('custom-update-channel')
//   .on(
//     'postgres_changes',
//     { event: 'UPDATE', schema: 'public', table: 'bmwJobs' },
//     (payload) => {
//       console.log('Change received!', payload)
//     }
//   )
//   .subscribe()


const topic = 'newJob';

supabase.channel('custom-insert-channel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'bmwJobs' },
    async (payload) => {
      console.log('Change received!', payload)

      const response = await fetch(`https://ntfy.sh/${topic}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: `${payload.new.job.po_number}, ${payload.new.job.service_type}, ${payload.new.status}`
    });
    }
  )
  .subscribe()