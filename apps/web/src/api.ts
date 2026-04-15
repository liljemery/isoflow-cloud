const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

function apiUrl(suffix: string) {
  const base = API_BASE.replace(/\/$/, '');
  const path = suffix.startsWith('/') ? suffix : `/${suffix}`;
  if (base.startsWith('http')) {
    return `${base}${path}`;
  }
  return `${base}${path}`;
}

export type AuthUser = { uuid: string; email: string };

export async function apiRegister(email: string, password: string) {
  const res = await fetch(apiUrl('/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = (await res.json()) as { token?: string; user?: AuthUser; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Register failed (${res.status})`);
  }
  if (!data.token || !data.user) {
    throw new Error('Invalid register response');
  }
  return { token: data.token, user: data.user };
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(apiUrl('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = (await res.json()) as { token?: string; user?: AuthUser; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Login failed (${res.status})`);
  }
  if (!data.token || !data.user) {
    throw new Error('Invalid login response');
  }
  return { token: data.token, user: data.user };
}

export type ProjectSummary = {
  uuid: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export async function apiListProjects(token: string, q?: string) {
  const path =
    q !== undefined && q !== ''
      ? `/projects?q=${encodeURIComponent(q)}`
      : '/projects';
  const res = await fetch(apiUrl(path), {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = (await res.json()) as { projects?: ProjectSummary[]; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `List failed (${res.status})`);
  }
  return data.projects ?? [];
}

export async function apiCreateProject(token: string, title?: string) {
  const body: { title?: string } = {};
  if (title !== undefined && title.trim() !== '') {
    body.title = title.trim();
  }
  const res = await fetch(apiUrl('/projects'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = (await res.json()) as {
    project?: { uuid: string };
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error ?? `Create failed (${res.status})`);
  }
  if (!data.project?.uuid) {
    throw new Error('Invalid create response');
  }
  return data.project.uuid;
}

export async function apiGetProject(token: string, uuid: string) {
  const res = await fetch(apiUrl(`/projects/${uuid}`), {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = (await res.json()) as {
    project?: { uuid: string; title: string; model: unknown };
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error ?? `Load failed (${res.status})`);
  }
  if (!data.project?.model) {
    throw new Error('Invalid project payload');
  }
  return data.project;
}

export async function apiPatchProject(token: string, uuid: string, model: unknown) {
  const res = await fetch(apiUrl(`/projects/${uuid}`), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model })
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Save failed (${res.status})`);
  }
}

export async function apiDeleteProject(token: string, uuid: string) {
  const res = await fetch(apiUrl(`/projects/${uuid}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? `Delete failed (${res.status})`);
  }
}
