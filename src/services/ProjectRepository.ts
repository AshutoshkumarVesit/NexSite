import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  prompt: string;
  category?: string;
  status: 'draft' | 'generating' | 'ready' | 'failed';
  createdAt: string;
  updatedAt: string;
  previewUrl?: string;
  generatedFiles?: Record<string, string>;
}

const STORAGE_KEY = 'nexsite_projects';

type ProjectListener = (projects: Project[]) => void;
const listeners: Set<ProjectListener> = new Set();

function notifyListeners() {
  const all = load();
  listeners.forEach(fn => {
    try { fn(all); } catch(e) {}
  });
}

function load(): Project[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function save(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  notifyListeners();
}

function toDb(project: Project) {
  return {
    id: project.id,
    owner_id: project.ownerId || 'guest_user',
    name: project.name,
    prompt: project.prompt,
    category: project.category || null,
    status: project.status,
    preview_url: project.previewUrl || null,
    generated_files: project.generatedFiles || {},
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
}

function fromDb(row: any): Project {
  return {
    id: row.id,
    ownerId: row.owner_id || 'guest_user',
    name: row.name,
    prompt: row.prompt,
    category: row.category || undefined,
    status: row.status as Project['status'],
    previewUrl: row.preview_url || undefined,
    generatedFiles: row.generated_files || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const ProjectRepository = {
  getAll(): Project[] {
    return load();
  },

  getByUser(userId: string): Project[] {
    return load().filter(p => p.ownerId === userId || p.ownerId === 'guest_user');
  },

  getById(id: string): Project | undefined {
    return load().find(p => p.id === id);
  },

  async getByIdAsync(id: string): Promise<Project | undefined> {
    const local = load().find(p => p.id === id);
    if (local && local.generatedFiles && Object.keys(local.generatedFiles).length > 0) {
      return local;
    }
    try {
      const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
      if (!error && data) {
        const remote = fromDb(data);
        const projects = load();
        const idx = projects.findIndex(p => p.id === id);
        if (idx >= 0) {
          projects[idx] = remote;
        } else {
          projects.unshift(remote);
        }
        save(projects);
        return remote;
      }
    } catch (e) {
      console.warn('[ProjectRepository] getByIdAsync Supabase error:', e);
    }
    return local;
  },

  async fetchRemote(userId?: string): Promise<Project[]> {
    try {
      let query = supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (userId && userId !== 'guest_user') {
        query = query.or(`owner_id.eq.${userId},owner_id.eq.guest_user`);
      }
      const { data, error } = await query;
      if (error) {
        console.warn('[ProjectRepository] Supabase fetch error (fallback to local):', error.message);
        return load();
      }
      if (data) {
        const remoteProjects: Project[] = data.map(fromDb);
        const current = load();
        const mergedMap = new Map<string, Project>();
        current.forEach(p => mergedMap.set(p.id, p));
        remoteProjects.forEach(p => mergedMap.set(p.id, p));
        const merged = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        save(merged);
        return remoteProjects;
      }
    } catch (err) {
      console.warn('[ProjectRepository] Failed to sync with Supabase:', err);
    }
    return load();
  },

  create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const projects = load();
    const project: Project = {
      ...data,
      ownerId: data.ownerId || 'guest_user',
      id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    projects.unshift(project);
    save(projects);

    // Asynchronously upsert to Supabase
    Promise.resolve(supabase
      .from('projects')
      .upsert([toDb(project)]))
      .then(({ error }) => {
        if (error) console.error('[ProjectRepository] Supabase create error:', error.message);
      })
      .catch((err: any) => console.error('[ProjectRepository] Supabase network error:', err));

    return project;
  },

  update(id: string, data: Partial<Project>): Project | null {
    const projects = load();
    const idx = projects.findIndex(p => p.id === id);
    if (idx === -1) return null;
    
    const updated = { 
      ...projects[idx], 
      ...data, 
      updatedAt: new Date().toISOString() 
    };
    projects[idx] = updated;
    save(projects);

    // Asynchronously upsert to Supabase
    Promise.resolve(supabase
      .from('projects')
      .upsert(toDb(updated)))
      .then(({ error }) => {
        if (error) console.error('[ProjectRepository] Supabase update error:', error.message);
      })
      .catch((err: any) => console.error('[ProjectRepository] Supabase network error:', err));

    return updated;
  },

  delete(id: string): boolean {
    const projects = load();
    const filtered = projects.filter(p => p.id !== id);
    if (filtered.length === projects.length) return false;
    save(filtered);

    // Asynchronously delete from Supabase
    Promise.resolve(supabase
      .from('projects')
      .delete()
      .eq('id', id))
      .then(({ error }) => {
        if (error) console.error('[ProjectRepository] Supabase delete error:', error.message);
      })
      .catch((err: any) => console.error('[ProjectRepository] Supabase network error:', err));

    return true;
  },

  subscribe(listener: ProjectListener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }
};

export function useProjects(userId?: string): Project[] {
  const [projects, setProjects] = useState<Project[]>(() =>
    userId ? ProjectRepository.getByUser(userId) : ProjectRepository.getAll()
  );

  useEffect(() => {
    // Initial fetch from Supabase
    ProjectRepository.fetchRemote(userId);

    const update = (all: Project[]) => {
      setProjects(userId ? all.filter(p => p.ownerId === userId || p.ownerId === 'guest_user') : all);
    };
    return ProjectRepository.subscribe(update);
  }, [userId]);

  return projects;
}
