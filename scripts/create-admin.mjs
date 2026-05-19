import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing Supabase URL or Service Role Key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser(email, password, fullName) {
  console.log(`Creating user ${email}...`);
  
  // 1. Create the user in Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      full_name: fullName
    }
  });

  if (authError) {
    console.error("Error creating user in Auth:", authError.message);
    return;
  }

  const userId = authData.user.id;
  console.log(`✅ User created in Auth with ID: ${userId}`);

  // 2. The profile might be created by a trigger, but let's make sure it's updated to 'admin'
  console.log("Updating role to admin...");
  
  // Wait a brief moment just in case there's an auth trigger that creates the profile
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ 
      role: 'admin',
      full_name: fullName,
      email: email
    })
    .eq('id', userId);

  if (profileError) {
    console.log("Profile might not exist yet from a trigger. Creating manually...");
    // Try to insert if update fails
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        full_name: fullName,
        role: 'admin'
      });
      
    if (insertError) {
       console.error("Error setting up profile:", insertError.message);
       return;
    }
  }

  // 3. (Optional) Also add to role_assignments table if your app strictly checks that
  console.log("Adding to role_assignments table...");
  const { error: roleError } = await supabase
    .from('role_assignments')
    .insert({
      user_id: userId,
      role: 'admin'
    });

  if (roleError && roleError.code !== '23505') { // Ignore unique constraint violation if exists
    console.error("Error assigning role:", roleError.message);
  } else {
    console.log("✅ Admin role assignment completed.");
  }

  console.log(`\n🎉 Successfully created admin user: ${email} with password: ${password}`);
}

// Get arguments from command line
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("Usage: node scripts/create-admin.mjs <email> <password> [\"Full Name\"]");
  console.log("Example: node scripts/create-admin.mjs admin@example.com mysecurepassword \"Admin User\"");
  process.exit(1);
}

const email = args[0];
const password = args[1];
const fullName = args[2] || "Admin User";

createAdminUser(email, password, fullName);
