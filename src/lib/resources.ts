import { createClient } from "@/lib/supabase";

export type Resource = {
  id: string;
  title: string;
  description?: string;
  category?: string; // e.g., 'document' | 'video'
  file_url?: string;
  created_by?: string;
  created_at?: string;
  client_user_id?: string;
};

export type CreateResourceInput = {
  title: string;
  description?: string;
  category?: string;
  file?: File | null;
  external_url?: string | null;
};

export async function listResources() {
  const timeoutMs = 15000;
  function withTimeout<T>(p: PromiseLike<T>, label: string): Promise<T> {
    return Promise.race([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]) as Promise<T>;
  }

  try {
    const supabase = createClient();
    const { data, error } = await withTimeout(
      supabase
        .from("resources")
        .select("*")
        .order("created_at", { ascending: false }),
      "List resources"
    );
    return { data: (data || []) as Resource[], error };
  } catch (err: any) {
    const message = err?.message || "Failed to load resources";
    return { data: [] as Resource[], error: new Error(message) };
  }
}

export async function createResource(input: CreateResourceInput) {
  const supabase = createClient();

  let fileUrl: string | undefined = undefined;
  const timeoutMs = 30000;
  function withTimeout<T>(p: PromiseLike<T>, label: string): Promise<T> {
    return Promise.race([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]) as Promise<T>;
  }

  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id || "unknown";
  if (input.file) {
    const fileNameSafe = input.file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const filePath = `${userId}/${Date.now()}_${fileNameSafe}`;

    const { error: uploadError } = await withTimeout(
      supabase.storage
        .from("resources")
        .upload(filePath, input.file, { upsert: false, contentType: input.file.type || undefined }),
      "Upload"
    );
    if (uploadError) return { data: null, error: uploadError };

    const { data: pub } = supabase.storage.from("resources").getPublicUrl(filePath);
    fileUrl = pub.publicUrl;
  } else if (input.external_url) {
    fileUrl = input.external_url;
  }

  const payload = {
    title: input.title,
    description: input.description || null,
    category: input.category || null,
    file_url: fileUrl || null,
    created_by: userId !== "unknown" ? userId : null,
  };

  const { data, error } = await withTimeout(
    supabase.from("resources").insert(payload).select("*").single(),
    "Save"
  );
  return { data: data as Resource | null, error };
}