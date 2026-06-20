import { defineStore } from 'pinia'
import type { DesignProject } from '~/types'

export const useProjectStore = defineStore('project', {
  state: () => ({
    projects: [] as DesignProject[],
    currentProjectId: null as string | null
  }),

  getters: {
    getCurrentProject(state): DesignProject | undefined {
      return state.projects.find(p => p.id === state.currentProjectId)
    }
  },

  actions: {
    loadProjects() {
      const data = localStorage.getItem('herbarium_projects')
      if (data) {
        this.projects = JSON.parse(data)
      }
    },

    saveProject(project: DesignProject) {
      const index = this.projects.findIndex(p => p.id === project.id)
      if (index >= 0) {
        this.projects[index] = project
      } else {
        this.projects.push(project)
      }
      this.persist()
    },

    deleteProject(id: string) {
      this.projects = this.projects.filter(p => p.id !== id)
      if (this.currentProjectId === id) {
        this.currentProjectId = null
      }
      this.persist()
    },

    createProject(): DesignProject {
      const project: DesignProject = {
        id: String(Date.now()),
        name: '未命名方案',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        thumbnail: '',
        canvasData: '',
        labels: [],
        filters: []
      }
      this.projects.push(project)
      this.persist()
      return project
    },

    duplicateProject(id: string) {
      const source = this.projects.find(p => p.id === id)
      if (!source) return
      const duplicated: DesignProject = {
        ...JSON.parse(JSON.stringify(source)),
        id: String(Date.now()),
        name: `${source.name} (副本)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      this.projects.push(duplicated)
      this.persist()
    },

    setCurrentProject(id: string | null) {
      this.currentProjectId = id
    },

    persist() {
      localStorage.setItem('herbarium_projects', JSON.stringify(this.projects))
    }
  }
})
