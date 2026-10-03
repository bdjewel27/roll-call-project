import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing Supabase environment variables.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Verify caller authentication and role using their JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user: callerUser }, error: userError } = await userClient.auth.getUser(token);

    if (userError || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid authentication session.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller role in public.profiles table
    const { data: callerProfile, error: profileCheckError } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .maybeSingle();

    if (profileCheckError || !callerProfile || callerProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin privilege required to manage teachers.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Initialize elevated Service Role client for administrative actions
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await req.json().catch(() => ({}));
    const { action, teacherData, teacherId: providedTeacherId, id } = body;
    const targetTeacherId = providedTeacherId || id;

    // --- ACTION: createTeacher ---
    if (action === 'createTeacher') {
      const data = teacherData || body;
      const email = (data.email || '').trim();
      const password = data.password || '';
      const fullName = (data.name || data.fullName || '').trim();
      const phone = (data.phone || '').trim() || null;
      const subject = (data.subject || '').trim() || null;
      const assignedClassIds = Array.isArray(data.assignedClassIds) ? data.assignedClassIds : [];

      if (!email || !fullName) {
        return new Response(
          JSON.stringify({ error: 'Teacher full name and email are required.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!password || password.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Password must be at least 6 characters.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 1. Create teacher auth user with service role
      const { data: authResult, error: createAuthError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role: 'teacher' },
      });

      if (createAuthError) {
        return new Response(
          JSON.stringify({ error: createAuthError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newUserId = authResult?.user?.id;
      if (!newUserId) {
        return new Response(
          JSON.stringify({ error: 'Failed to create teacher account: No user ID generated.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 2. Insert profile record in public.profiles table
      const profilePayload = {
        id: newUserId,
        full_name: fullName,
        email,
        phone,
        subject,
        role: 'teacher',
      };

      const { data: profileRow, error: insertProfileError } = await adminClient
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (insertProfileError) {
        // Rollback created auth user to avoid orphan auth account
        await adminClient.auth.admin.deleteUser(newUserId).catch((err) => {
          console.error('Failed to cleanup orphan user:', err);
        });

        return new Response(
          JSON.stringify({ error: `Failed to create profile: ${insertProfileError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. Insert class assignments if provided
      let actualAssignedClassIds: string[] = [];
      let assignmentErrorMsg: string | null = null;

      if (assignedClassIds.length > 0) {
        const assignmentRows = assignedClassIds.map((cId: string) => ({
          teacher_id: newUserId,
          class_id: cId,
        }));

        const { error: assignError } = await adminClient
          .from('teacher_class_assignments')
          .insert(assignmentRows);

        if (assignError) {
          console.error('Error assigning classes during teacher creation:', assignError.message);
          assignmentErrorMsg = `Teacher created, but assigning classes failed: ${assignError.message}`;
        } else {
          actualAssignedClassIds = assignedClassIds;
        }
      }

      if (assignmentErrorMsg) {
        return new Response(
          JSON.stringify({
            data: {
              id: profileRow?.id || newUserId,
              name: profileRow?.full_name || fullName,
              email: profileRow?.email || email,
              phone: profileRow?.phone || phone || '',
              subject: profileRow?.subject || subject || '',
              assignedClassIds: [],
            },
            warning: assignmentErrorMsg,
            message: assignmentErrorMsg,
          }),
          { status: 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          data: {
            id: profileRow?.id || newUserId,
            name: profileRow?.full_name || fullName,
            email: profileRow?.email || email,
            phone: profileRow?.phone || phone || '',
            subject: profileRow?.subject || subject || '',
            assignedClassIds: actualAssignedClassIds,
          },
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- ACTION: deleteTeacher ---
    if (action === 'deleteTeacher') {
      if (!targetTeacherId) {
        return new Response(
          JSON.stringify({ error: 'Teacher ID is required to delete teacher.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 1. Delete associated class assignments
      const { error: assignError } = await adminClient
        .from('teacher_class_assignments')
        .delete()
        .eq('teacher_id', targetTeacherId);

      if (assignError) {
        console.warn('Warning deleting teacher class assignments:', assignError.message);
      }

      // 2. Delete record from public.profiles
      const { error: profileDeleteError } = await adminClient
        .from('profiles')
        .delete()
        .eq('id', targetTeacherId);

      if (profileDeleteError) {
        return new Response(
          JSON.stringify({ error: `Failed to delete teacher profile: ${profileDeleteError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. Delete auth account using adminAuthClient.deleteUser
      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(targetTeacherId);

      if (authDeleteError) {
        console.error('Error deleting teacher auth account:', authDeleteError.message);
        return new Response(
          JSON.stringify({
            error: `Failed to completely delete teacher: Profile was removed, but login account deletion failed (${authDeleteError.message}).`,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Teacher deleted successfully.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: "${action}". Supported actions are "createTeacher" and "deleteTeacher".` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
