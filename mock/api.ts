import type { PlantMaterial, MaterialCategory, DesignProject } from '~/types'
import { materials, categories } from './materials'

function delay(ms: number = 20): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function getMaterials(): Promise<PlantMaterial[]> {
  await delay()
  return [...materials]
}

export async function getMaterialById(id: string): Promise<PlantMaterial | undefined> {
  await delay()
  return materials.find(m => m.id === id)
}

export async function getCategories(): Promise<MaterialCategory[]> {
  await delay()
  return [...categories]
}

function getProjectsFromStorage(): DesignProject[] {
  if (import.meta.client) {
    const data = localStorage.getItem('herbarium_projects')
    if (data) {
      return JSON.parse(data)
    }
  }
  return []
}

function saveProjectsToStorage(projects: DesignProject[]): void {
  if (import.meta.client) {
    localStorage.setItem('herbarium_projects', JSON.stringify(projects))
  }
}

export async function getProjects(): Promise<DesignProject[]> {
  await delay()
  return getProjectsFromStorage()
}

export async function getProjectById(id: string): Promise<DesignProject | undefined> {
  await delay()
  const projects = getProjectsFromStorage()
  return projects.find(p => p.id === id)
}

export async function createProject(data: Partial<DesignProject>): Promise<DesignProject> {
  await delay()
  const projects = getProjectsFromStorage()
  const now = new Date().toISOString()
  const newProject: DesignProject = {
    id: `proj_${Date.now()}`,
    name: data.name || '未命名方案',
    createdAt: now,
    updatedAt: now,
    thumbnail: data.thumbnail || '',
    canvasData: data.canvasData || '',
    labels: data.labels || [],
    filters: data.filters || [],
  }
  projects.push(newProject)
  saveProjectsToStorage(projects)
  return newProject
}

export async function updateProject(id: string, data: Partial<DesignProject>): Promise<DesignProject> {
  await delay()
  const projects = getProjectsFromStorage()
  const index = projects.findIndex(p => p.id === id)
  if (index === -1) {
    throw new Error(`Project with id ${id} not found`)
  }
  const updated: DesignProject = {
    ...projects[index],
    ...data,
    id: projects[index].id,
    createdAt: projects[index].createdAt,
    updatedAt: new Date().toISOString(),
  }
  projects[index] = updated
  saveProjectsToStorage(projects)
  return updated
}

export async function deleteProject(id: string): Promise<{ success: boolean }> {
  await delay()
  const projects = getProjectsFromStorage()
  const filtered = projects.filter(p => p.id !== id)
  saveProjectsToStorage(filtered)
  return { success: filtered.length < projects.length }
}
