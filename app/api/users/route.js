import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getAdminClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment variables')
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password, full_name, phone, role } = body

    if (!email || !password || !full_name || !role) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['admin', 'salesperson', 'dispatcher'].includes(role)) {
      return Response.json({ error: 'Invalid role' }, { status: 400 })
    }

    const adminClient = getAdminClient()

    // Verify the caller is an admin
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !caller) {
      return Response.json({ error: `Unauthorized: ${authError?.message || 'no user'}` }, { status: 401 })
    }

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return Response.json({ error: 'Only admins can create users' }, { status: 403 })
    }

    // Create auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      return Response.json({ error: createError.message }, { status: 400 })
    }

    // Create profile
    const { error: insertProfileError } = await adminClient
      .from('profiles')
      .insert({ id: newUser.user.id, full_name, phone: phone || null, role })

    if (insertProfileError) {
      // Rollback: delete the auth user
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return Response.json({ error: insertProfileError.message }, { status: 400 })
    }

    return Response.json({
      user: { id: newUser.user.id, email, full_name, phone, role }
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return Response.json({ error: 'Missing user id' }, { status: 400 })
    }

    const adminClient = getAdminClient()

    // Verify caller is admin
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !caller) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return Response.json({ error: 'Only admins can delete users' }, { status: 403 })
    }

    // Delete profile first (CASCADE will handle it, but let's be explicit)
    await adminClient.from('profiles').delete().eq('id', userId)

    // Delete auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 400 })
    }

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
