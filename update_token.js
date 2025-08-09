import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

/**
 * Updates or creates a token in the urgentlyAuthToken table
 * @param {string} token - The token to be stored
 * @returns {Promise<{success: boolean, error: any}>} Result of the operation
 */
async function updateToken(token) {
  try {
    // Check if table has any records
    const { data: existingTokens, error: fetchError } = await supabase
      .from('urgentlyAuthToken')
      .select('*')

    if (fetchError) throw fetchError

    if (existingTokens.length === 0) {
      // Insert new record if table is empty
      const { error: insertError } = await supabase
        .from('urgentlyAuthToken')
        .insert([
          { 
            id: 1,
            token: token,
            created_at: new Date().toISOString()
          }
        ])
      
      if (insertError) throw insertError
    } else {
      // Update existing record with id = 1
      const { error: updateError } = await supabase
        .from('urgentlyAuthToken')
        .update({ 
          token: token,
          created_at: new Date().toISOString()
        })
        .eq('id', 1)
      
      if (updateError) throw updateError
    }

    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default updateToken


// (async () => {
//     const token = 'your_token_here_1'
//     const result = await updateToken(token)
//     console.log(result)
// })()